import * as core from '@actions/core'
import * as github from '@actions/github'

import { getRepository, createCommitOnBranch } from './github/graphql'
import { isCommit } from './github/types'
import { Commit } from '@octokit/graphql-schema'
import { addFileChanges, getFileChanges } from './git'
import { getInput } from './utils/input'
import { FileMissingError, NoChangesError } from './errors'

export async function run(): Promise<void> {
  try {
    const filePaths = core.getMultilineInput('files', { required: true })
    if (filePaths.length <= 0) throw new FileMissingError()

    await addFileChanges(filePaths)
    const fileChanges = await getFileChanges()
    const fileCount =
      (fileChanges.additions?.length ?? 0) +
      (fileChanges.deletions?.length ?? 0)
    if (fileCount <= 0) throw new NoChangesError()

    const { owner, repo } = github.context.repo
    const repository = await core.group(
      `fetching repository info for owner: ${owner}, repo: ${repo}`,
      async () => {
        const startTime = Date.now()
        const repositoryData = await getRepository(owner, repo)
        const endTime = Date.now()
        core.debug(`time taken: ${(endTime - startTime).toString()} ms`)
        return repositoryData
      }
    )

    const ref = getInput('ref', { default: repository.defaultBranchRef?.name })
    const commitResponse = await core.group(`committing files`, async () => {
      const startTime = Date.now()
      const target = repository.defaultBranchRef?.target
      const parentCommit = isCommit(target)
        ? target
        : (() => {
            throw new Error(
              `Unable to locate the parent commit of the branch ${ref}`
            )
          })()
      const commitData = await createCommitOnBranch(
        {
          repositoryNameWithOwner: repository.nameWithOwner,
          branchName: ref,
        },
        parentCommit,
        fileChanges
      )
      const endTime = Date.now()
      core.debug(`time taken: ${(endTime - startTime).toString()} ms`)
      return commitData
    })

    core.setOutput('commit-sha', commitResponse.commit?.id)
  } catch (error) {
    if (error instanceof NoChangesError) {
      core.info('No changes found')
    } else if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}
