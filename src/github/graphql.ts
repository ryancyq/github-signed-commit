import * as core from '@actions/core'
import { GraphqlResponseError } from '@octokit/graphql'
import {
  Commit,
  CommittableBranch,
  FileChanges,
  CreateCommitOnBranchInput,
  CreateCommitOnBranchPayload,
  CreateRefInput,
  CreateRefPayload,
} from '@octokit/graphql-schema'

import { graphqlClient } from './client'
import { getBlob } from '../blob'
import { RepositoryWithCommitHistory } from '../github/types'

function logSuccess(
  queryName: string,
  query: string,
  variables: unknown,
  data: unknown
) {
  core.debug(
    `Request[${queryName}] successful, query: ${query}, variables: ${JSON.stringify(variables)}, data: ${JSON.stringify(data)}`
  )
}

function logError(queryName: string, error: GraphqlResponseError<unknown>) {
  const { query, variables } = error.request
  core.error(error.message)
  core.debug(
    `Request[${queryName}] failed, query: ${query as string}, variables: ${JSON.stringify(variables)}, data: ${JSON.stringify(error.data)}`
  )
}

export async function getRepository(
  owner: string,
  repo: string,
  branch: string
): Promise<RepositoryWithCommitHistory> {
  const query = `
    query($owner: String!, $repo: String!, $ref: String!) {
      repository(owner: $owner, name: $repo) {
        id
        nameWithOwner
        ref(qualifiedName: $ref) {
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

  const variables = {
    owner: owner,
    repo: repo,
    ref: `refs/heads/${branch}`,
  }
  try {
    const { repository } = await graphqlClient()<{
      repository: RepositoryWithCommitHistory
    }>(query, variables)

    logSuccess('repository', query, variables, repository)

    return repository
  } catch (error) {
    if (error instanceof GraphqlResponseError) logError('repository', error)
    throw error
  }
}

export async function createCommitOnBranch(
  currentCommit: Commit,
  commitMessage: string,
  branch: CommittableBranch,
  fileChanges: FileChanges
): Promise<CreateCommitOnBranchPayload> {
  if (fileChanges.additions) {
    const promises = fileChanges.additions.map((file) =>
      getBlob(file.path).load()
    )
    fileChanges.additions = await Promise.all(promises)
  }

  const mutation = `
    mutation($commitInput: CreateCommitOnBranchInput!) {
      createCommitOnBranch(input: $commitInput) {
        commit {
          oid
          message
          committedDate
        }
      }
    }`

  const commitInput: CreateCommitOnBranchInput = {
    branch,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    expectedHeadOid: currentCommit.oid,
    message: {
      headline: commitMessage,
    },
    fileChanges,
  }

  const variables = { commitInput }

  try {
    const { createCommitOnBranch } = await graphqlClient()<{
      createCommitOnBranch: CreateCommitOnBranchPayload
    }>(mutation, variables)

    logSuccess(
      'createCommitOnBranch',
      mutation,
      variables,
      createCommitOnBranch
    )

    return createCommitOnBranch
  } catch (error) {
    if (error instanceof GraphqlResponseError)
      logError('createCommitOnBranch', error)
    throw error
  }
}

export async function createTagOnCommit(
  currentCommit: Commit,
  tag: string,
  repositoryId: string
): Promise<CreateRefPayload> {
  const mutation = `
    mutation(tagInput: CreateRefInput!) {
      createRef(input: $tagInput) {
        ref {
          name
        }
      }
    }`

  const tagInput: CreateRefInput = {
    repositoryId: repositoryId,
    name: `refs/tags/${tag}`,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    oid: currentCommit.oid,
  }

  const variables = { tagInput }

  try {
    const { createRef } = await graphqlClient()<{
      createRef: CreateRefPayload
    }>(mutation, variables)

    logSuccess('createTagOnCommit', mutation, variables, createRef)

    return createRef
  } catch (error) {
    if (error instanceof GraphqlResponseError)
      logError('createTagOnCommit', error)
    throw error
  }
}
