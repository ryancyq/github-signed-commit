import * as core from '@actions/core'
import * as github from '@actions/github'

import { Commit } from '@octokit/graphql-schema'
import { getRepository, createCommitOrTag } from './github/graphql'
import { isCommit } from './github/types'
import {
  addFileChanges,
  getFileChanges,
  pushCurrentBranch,
  switchBranch,
} from './git'
import { getInput } from './utils/input'
import {
  NoFileChanges,
  InputFilesRequired,
  InputBranchNotFound,
} from './errors'

export async function run(): Promise<void> {
  try {
    const { owner, repo } = github.context.repo
    const { ref, eventName } = github.context
    let currentBranch = ''
    if (ref.startsWith('refs/heads/')) {
      currentBranch = ref.replace(/refs\/heads\//g, '')
    } else if (eventName === 'pull_request') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      currentBranch = github.context.payload.pull_request?.head?.ref || ''
    }
    if (!currentBranch)
      throw new Error(`Unsupported event: ${eventName}, ref: ${ref}`)

    const targetBranch = getInput('branch-name')
    const branchName =
      targetBranch && currentBranch != targetBranch
        ? targetBranch
        : currentBranch

    if (branchName !== currentBranch) {
      await switchBranch(branchName)
      await pushCurrentBranch()
    }

    const filePaths = core.getMultilineInput('files', { required: true })
    if (filePaths.length <= 0) throw new InputFilesRequired()

    await addFileChanges(filePaths)
    const fileChanges = await getFileChanges()
    const fileCount =
      (fileChanges.additions?.length ?? 0) +
      (fileChanges.deletions?.length ?? 0)
    if (fileCount <= 0) throw new NoFileChanges()

    const repository = await core.group(
      `fetching repository info for owner: ${owner}, repo: ${repo}, branch: ${branchName}`,
      async () => {
        const startTime = Date.now()
        const repositoryData = await getRepository(owner, repo, branchName)
        const endTime = Date.now()
        core.debug(`time taken: ${(endTime - startTime).toString()} ms`)
        return repositoryData
      }
    )

    const remoteCommit = repository.ref?.target.history?.nodes?.[0]
    const currentCommit = isCommit(remoteCommit) ? remoteCommit : ({} as Commit)
    if (!repository.ref && branchName !== currentBranch) {
      throw new InputBranchNotFound(targetBranch)
    }

    let createTag = undefined
    const tag = getInput('tag')
    if (tag) {
      createTag = {
        tag,
        repositoryId: repository.id,
      }
    }
    const createResponse = await core.group(`committing files`, async () => {
      const startTime = Date.now()
      const commitData = await createCommitOrTag(
        currentCommit,
        {
          branch: {
            repositoryNameWithOwner: repository.nameWithOwner,
            branchName: branchName,
          },
          fileChanges: fileChanges,
        },
        createTag
      )
      const endTime = Date.now()
      core.debug(`time taken: ${(endTime - startTime).toString()} ms`)
      return commitData
    })

    core.setOutput(
      'commit-sha',
      createResponse.createCommitOnBranch?.commit?.oid
    )
  } catch (error) {
    if (error instanceof NoFileChanges) {
      core.notice('No changes found')
    } else if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      throw error
    }
  }
}
