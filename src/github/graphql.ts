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

async function prepareCreateCommitOnBranch(
  currentCommit: Commit,
  branch: CommittableBranch,
  fileChanges: FileChanges
) {
  if (fileChanges.additions) {
    const promises = fileChanges.additions.map((file) =>
      getBlob(file.path).load()
    )
    fileChanges.additions = await Promise.all(promises)
  }

  const input = 'commitInput'
  const query = `
    createCommitOnBranch(input: $${input}) {
      commit {
        oid
      }
    }
  `
  const commitMessage = core.getInput('commit-message', { required: true })
  const variables: CreateCommitOnBranchInput = {
    branch,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    expectedHeadOid: currentCommit.oid,
    message: {
      headline: commitMessage,
    },
    fileChanges,
  }

  return { input, query, variables }
}

function prepareCreateTag(
  currentCommit: Commit,
  tag: string,
  repositoryId: string
) {
  const input = 'tagInput'
  const query = `
    createRef(input: $${input}) {
      ref {
        name
      }
    }
  `
  const variables: CreateRefInput = {
    repositoryId: repositoryId,
    name: `refs/tags/${tag}`,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    oid: currentCommit.oid,
  }

  return { input, query, variables }
}

export class CreateCommitInput {
  branch: CommittableBranch
  fileChanges: FileChanges

  constructor(branch: CommittableBranch, fileChanges: FileChanges) {
    this.branch = branch
    this.fileChanges = fileChanges
  }
}

export class CreateTagInput {
  tag: string
  repositoryId: string

  constructor(tag: string, repositoryId: string) {
    this.tag = tag
    this.repositoryId = repositoryId
  }
}

export async function createCommitOrTag(
  currentCommit: Commit,
  createCommit?: CreateCommitInput,
  createTag?: CreateTagInput
): Promise<{
  createCommitOnBranch?: CreateCommitOnBranchPayload
  createRef?: CreateRefPayload
}> {
  const mutationInputs: string[] = []
  const mutationQueries: string[] = []
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style,@typescript-eslint/no-explicit-any
  const mutationVariables: { [key: string]: any } = {}

  if (createCommit) {
    const { input, query, variables } = await prepareCreateCommitOnBranch(
      currentCommit,
      createCommit.branch,
      createCommit.fileChanges
    )
    mutationInputs.push(`$${input}: CreateCommitOnBranchInput!`)
    mutationQueries.push(query)
    mutationVariables[input] = variables
  }

  if (createTag) {
    const { input, query, variables } = prepareCreateTag(
      currentCommit,
      createTag.tag,
      createTag.repositoryId
    )
    mutationInputs.push(`$${input}: CreateRefInput!`)
    mutationQueries.push(query)
    mutationVariables[input] = variables
  }

  const mutation = `
    mutation(${mutationInputs.join(',')}) {
      ${mutationQueries.join('\n')}
    }`

  try {
    const response = await graphqlClient()<{
      createCommitOnBranch?: CreateCommitOnBranchPayload
      createRef?: CreateRefPayload
    }>(mutation, mutationVariables)

    logSuccess('createCommitOrTag', mutation, mutationVariables, response)

    return response
  } catch (error) {
    if (error instanceof GraphqlResponseError)
      logError('createCommitOrTag', error)
    throw error
  }
}
