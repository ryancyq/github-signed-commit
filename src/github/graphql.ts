import * as core from '@actions/core'
import { GraphqlResponseError } from '@octokit/graphql'
import {
  Commit,
  CommittableBranch,
  CreateCommitOnBranchPayload,
  FileChanges,
  MutationCreateCommitOnBranchArgs,
} from '@octokit/graphql-schema'

import { graphqlClient } from './client'
import { getBlob } from '../blob'
import { RepositoryWithCommitHistory } from '../github/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function logSuccess(queryName: string, data: any) {
  core.debug(`Request[${queryName}] successful, data: ${JSON.stringify(data)}`)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function logError(queryName: string, error: GraphqlResponseError<any>) {
  const { query, variables } = error.request
  core.error(error.message)
  core.debug(
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    `Request[${queryName}] failed, query: ${query}, variables: ${JSON.stringify(variables)}, data: ${JSON.stringify(error.data)}`
  )
}

export async function getRepository(
  owner: string,
  repo: string
): Promise<RepositoryWithCommitHistory> {
  const query = `
    query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        id
        nameWithOwner
        defaultBranchRef {
          name
          target {
            ... on Commit {
              history(first: 1) {
                nodes {
                  oid
                  message
                  committedDate
                }
              }
            }
          }
        }
      }
    }
  `

  try {
    const { repository } = await graphqlClient()<{
      repository: RepositoryWithCommitHistory
    }>(query, {
      owner: owner,
      repo: repo,
    })

    logSuccess('repository', repository)

    return repository
  } catch (error) {
    if (error instanceof GraphqlResponseError) logError('repository', error)
    throw error
  }
}

export async function createCommitOnBranch(
  branch: CommittableBranch,
  parentCommit: Commit,
  fileChanges: FileChanges
): Promise<CreateCommitOnBranchPayload> {
  const commitMessage = core.getInput('commit-message', { required: true })
  const mutation = `
      mutation($input: CreateCommitOnBranchInput!) {
      createCommitOnBranch(input: $input) {
        commit {
          id
        }
      }
    }`

  if (fileChanges.additions) {
    const promises = fileChanges.additions.map((file) =>
      getBlob(file.path).load()
    )
    fileChanges.additions = await Promise.all(promises)
  }

  const input: MutationCreateCommitOnBranchArgs = {
    input: {
      branch,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expectedHeadOid: parentCommit.oid,
      message: {
        headline: commitMessage,
      },
      fileChanges,
    },
  }

  try {
    const { createCommitOnBranch } = await graphqlClient()<{
      createCommitOnBranch: CreateCommitOnBranchPayload
    }>(mutation, input)

    logSuccess('createCommitOnBranch', createCommitOnBranch)

    return createCommitOnBranch
  } catch (error) {
    if (error instanceof GraphqlResponseError)
      logError('createCommitOnBranch', error)
    throw error
  }
}
