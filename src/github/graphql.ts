import * as core from '@actions/core'
import { GraphqlResponseError } from '@octokit/graphql'
import {
  Repository,
  CreateCommitOnBranchPayload,
  MutationCreateCommitOnBranchArgs,
  CommittableBranch,
  FileChanges,
} from '@octokit/graphql-schema'

import { graphqlClient } from './client'
import { getBlob } from '../blob'

export async function getRepository(
  owner: string,
  repo: string
): Promise<Repository> {
  try {
    const query = `
        query($owner: String!, $repo: String!) {
          repository(owner: $owner, name: $repo) {
            id
            defaultBranchRef {
              name
              target {
                ... on Commit {
                  history(first: 1) {
                    nodes {
                      oid
                    }
                  }
                }
              }
            }
          }
        }
      `
    const { repository } = await graphqlClient()<{ repository: Repository }>(
      query,
      {
        owner: owner,
        repo: repo,
      }
    )

    return repository
  } catch (error) {
    if (error instanceof GraphqlResponseError) {
      const { query, variables } = error.request
      core.error(error.message)
      core.debug(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `Request failed, query: ${query}, variables: ${JSON.stringify(variables)}, data: ${error.data}`
      )
    }
    throw error
  }
}

export async function createCommitOnBranch(
  branch: CommittableBranch,
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
      expectedHeadOid: undefined,
      message: {
        headline: commitMessage,
      },
      fileChanges,
    },
  }
  const { createCommitOnBranch } = await graphqlClient()<{
    createCommitOnBranch: CreateCommitOnBranchPayload
  }>(mutation, input)
  return createCommitOnBranch
}
