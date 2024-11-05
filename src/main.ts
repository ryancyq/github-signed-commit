import * as core from '@actions/core'
import { Commit } from '@octokit/graphql-schema'

import {
  getRepository,
  createCommitOnBranch,
  createTagOnCommit,
} from './github/graphql'
import { getContext } from './github/repo'
import {
  addFileChanges,
  getFileChanges,
  pushCurrentBranch,
  switchBranch,
} from './git'
import { getInput } from './utils/input'
import {
  NoFileChanges,
  BranchNotFound,
  BranchCommitNotFound,
  InputRepositoryInvalid,
  InputBranchNotFound,
} from './errors'

export async function run(): Promise<void> {
  try {
    const { owner, repo, branch } = getContext()
    const inputRepository = getInput('repository')
    const inputBranch = getInput('branch-name')
    if (inputBranch && inputBranch !== branch) {
      await switchBranch(inputBranch)
      await pushCurrentBranch()
    }

    const repositoryParts = inputRepository ? inputRepository.split('/') : []
    if (repositoryParts.length && repositoryParts.length != 2) {
      throw new InputRepositoryInvalid(inputRepository)
    }

    const currentOwner = repositoryParts.length ? repositoryParts[0] : owner
    const currentRepository = repositoryParts.length ? repositoryParts[1] : repo
    const currentBranch = inputBranch ? inputBranch : branch
    const repository = await core.group(
      `fetching repository info for owner: ${currentOwner}, repo: ${currentRepository}, branch: ${currentBranch}`,
      async () => {
        const startTime = Date.now()
        const repositoryData = await getRepository(
          currentOwner,
          currentRepository,
          currentBranch
        )
        const endTime = Date.now()
        core.debug(`time taken: ${(endTime - startTime).toString()} ms`)
        return repositoryData
      }
    )

    if (!repository.ref) {
      if (inputBranch && currentBranch == inputBranch) {
        throw new InputBranchNotFound(inputBranch)
      } else {
        throw new BranchNotFound(currentBranch)
      }
    }

    const currentCommit = repository.ref.target.history?.nodes?.[0]
    if (!currentCommit) {
      throw new BranchCommitNotFound(repository.ref.name)
    }

    let createdCommit: Commit | undefined
    const filePaths = core.getMultilineInput('files')
    if (filePaths.length <= 0) {
      core.debug('skip file commit, empty files input')
    } else {
      core.debug(
        `proceed with file commit, input: ${JSON.stringify(filePaths)}`
      )

      await addFileChanges(filePaths)
      const fileChanges = await getFileChanges()
      const fileCount =
        (fileChanges.additions?.length ?? 0) +
        (fileChanges.deletions?.length ?? 0)
      core.info(`detected ${fileCount.toString()} file changes`)
      core.debug(`detect file changes: ${JSON.stringify(fileChanges)}`)

      if (fileCount <= 0) {
        const skipTagCommit = core.getBooleanInput('tag-only-if-file-changes')
        if (skipTagCommit) throw new NoFileChanges()
        core.notice(new NoFileChanges().message)
      } else {
        const commitMessage = core.getInput('commit-message', {
          required: true,
        })
        core.debug(`commit message: ${commitMessage}`)
        const createResponse = await core.group(
          'committing files',
          async () => {
            const startTime = Date.now()
            const commitData = await createCommitOnBranch(
              currentCommit,
              commitMessage,
              {
                repositoryNameWithOwner: repository.nameWithOwner,
                branchName: currentBranch,
              },
              fileChanges
            )
            const endTime = Date.now()
            core.debug(`time taken: ${(endTime - startTime).toString()} ms`)
            return commitData
          }
        )
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        createdCommit = createResponse.commit!
        const commitSha = createdCommit.oid as string
        core.info(`committed with ${commitSha}`)
        core.setOutput('commit-sha', commitSha)
      }
      core.debug('completed file commit')
    }

    const tag = getInput('tag')
    if (!tag) {
      core.debug('skip commit tagging, empty tag input')
    } else {
      const tagCommit = createdCommit ?? currentCommit
      core.debug(
        `proceed with commit tagging, input: ${tag}, commit: ${tagCommit.oid as string}`
      )
      const tagResponse = await core.group('tagging commit', async () => {
        const startTime = Date.now()
        const tagData = await createTagOnCommit(tagCommit, tag, repository.id)
        const endTime = Date.now()
        core.debug(`time taken: ${(endTime - startTime).toString()} ms`)
        return tagData
      })
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const tagName = tagResponse.ref!.name
      core.info(`committed tag ${tagName} at ${tagCommit.oid as string}`)
      core.setOutput('tag', tagName)
      core.debug('completed commit tag')
    }

    if (filePaths.length <= 0 && !tag) {
      core.setFailed('Neither files nor tag input has been configured')
    }
  } catch (error) {
    if (error instanceof NoFileChanges) {
      core.notice(error.message)
    } else if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      throw error
    }
  }
}
