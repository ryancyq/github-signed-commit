import * as core from '@actions/core'
import { GraphqlResponseError } from '@octokit/graphql'
import { RequestParameters } from '@octokit/types'
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

function formatLogMessage(...params: Record<string, unknown>[]): string {
  return Object.entries(Object.assign({}, ...params) as Record<string, unknown>)
    .map(([key, value]) => {
      return `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`
    })
    .join(', ')
}

async function execGraphql<T>(
  name: string,
  query: string,
  variables: RequestParameters
): Promise<T> {
  const requestParams = {
    query: query,
    variables: JSON.stringify(variables),
  }
  try {
    const response = await graphqlClient()<T>(query, variables)
    core.debug(
      formatLogMessage({ request: name, status: 'success' }, requestParams, {
        data: response,
      })
    )
    return response
  } catch (error) {
    if (error instanceof GraphqlResponseError) {
      core.error(error.message)
      core.debug(
        formatLogMessage({ request: name, status: 'failed' }, requestParams, {
          data: error.data,
        })
      )
    }
    throw error
  }
}

const getRepositoryQuery = `
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

export async function getRepository(
  owner: string,
  repo: string,
  branch: string
): Promise<RepositoryWithCommitHistory> {
  const variables = {
    owner: owner,
    repo: repo,
    ref: `refs/heads/${branch}`,
  }

  const { repository } = await execGraphql<{
    repository: RepositoryWithCommitHistory
  }>('GetRepository', getRepositoryQuery, variables)
  return repository
}

const createCommitMutation = `
  mutation($commitInput: CreateCommitOnBranchInput!) {
    createCommitOnBranch(input: $commitInput) {
      commit {
        oid
        message
        committedDate
      }
    }
  }
`

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

  const commitInput: CreateCommitOnBranchInput = {
    branch,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    expectedHeadOid: currentCommit.oid,
    message: {
      headline: commitMessage,
    },
    fileChanges,
  }

  const { createCommitOnBranch } = await execGraphql<{
    createCommitOnBranch: CreateCommitOnBranchPayload
  }>('CreateCommitOnBranch', createCommitMutation, { commitInput })
  return createCommitOnBranch
}

const createTagMutation = `
  mutation($tagInput: CreateRefInput!) {
    createRef(input: $tagInput) {
      ref {
        name
      }
    }
  }
`

export async function createTagOnCommit(
  currentCommit: Commit,
  tag: string,
  repositoryId: string
): Promise<CreateRefPayload> {
  const tagInput: CreateRefInput = {
    repositoryId: repositoryId,
    name: `refs/tags/${tag}`,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    oid: currentCommit.oid,
  }

  const { createRef } = await execGraphql<{
    createRef: CreateRefPayload
  }>('CreateTagOnCommit', createTagMutation, { tagInput })
  return createRef
}
