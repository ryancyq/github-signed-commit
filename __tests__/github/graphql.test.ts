import * as core from '@actions/core'
import fetchMock from 'fetch-mock'
import { Readable } from 'node:stream'
import { describe, jest, beforeEach, it, expect } from '@jest/globals'
import { RequestOptions } from '@octokit/types'
import { graphql, GraphqlResponseError } from '@octokit/graphql'
import {
  Commit,
  CommittableBranch,
  CreateCommitOnBranchPayload,
  FileAddition,
  FileChanges,
  Repository,
} from '@octokit/graphql-schema'
import * as client from '../../src/github/client'
import * as blob from '../../src/blob'
import { getRepository, createCommitOrTag } from '../../src/github/graphql'

describe('GitHub API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    fetchMock.reset()
  })

  describe('getRepository', () => {
    it('should fetch repository details', async () => {
      const clientMock = jest.spyOn(client, 'graphqlClient').mockReturnValue(
        graphql.defaults({
          request: {
            fetch: fetchMock
              .sandbox()
              .post(
                'https://api.github.com/graphql',
                (_url, options: RequestOptions) => {
                  const body = JSON.parse(options.body)
                  expect(body.query).toEqual(
                    expect.stringMatching(/query(.+\$owner.+\$repo.+\$ref)/)
                  )

                  expect(body.variables).toHaveProperty('owner', 'owner')
                  expect(body.variables).toHaveProperty('repo', 'repo')
                  expect(body.variables).toHaveProperty(
                    'ref',
                    'refs/heads/custom-branch'
                  )

                  return {
                    data: {
                      repository: {
                        id: 'repo-id',
                        nameWithOwner: 'my-user/repo-id',
                        ref: {
                          name: 'custom-branch',
                          target: {
                            history: {
                              nodes: [
                                {
                                  oid: 'another-oid',
                                  message: 'another message',
                                  committedDate: '2024-08-19T04:53:47Z',
                                  __typename: 'Commit',
                                },
                              ],
                            },
                          },
                          __typename: 'Ref',
                        },
                        defaultBranchRef: {
                          name: 'main',
                          target: {
                            history: {
                              nodes: [
                                {
                                  oid: 'my-oid',
                                  message: 'my message',
                                  committedDate: '2024-08-19T04:53:47Z',
                                  __typename: 'Commit',
                                },
                              ],
                            },
                          },
                          __typename: 'Ref',
                        },
                        __typename: 'Repository',
                      },
                    },
                  }
                }
              ),
          },
        })
      )
      const debugMock = jest.spyOn(core, 'debug').mockReturnValue()

      const repo = await getRepository('owner', 'repo', 'custom-branch')
      expect(clientMock).toHaveBeenCalled()
      expect(repo).toHaveProperty('id', 'repo-id')
      expect(repo).toHaveProperty('nameWithOwner', 'my-user/repo-id')
      expect(repo).toHaveProperty('ref.name', 'custom-branch')
      expect(repo).toHaveProperty(
        'ref.target.history.nodes',
        expect.arrayContaining([
          expect.objectContaining({
            oid: 'another-oid',
            message: 'another message',
            committedDate: '2024-08-19T04:53:47Z',
          }),
        ])
      )
      expect(repo).toHaveProperty('defaultBranchRef.name', 'main')
      expect(repo).toHaveProperty(
        'defaultBranchRef.target.history.nodes',
        expect.arrayContaining([
          expect.objectContaining({
            oid: 'my-oid',
            message: 'my message',
            committedDate: '2024-08-19T04:53:47Z',
          }),
        ])
      )
      expect(debugMock).toHaveBeenCalledWith(
        expect.stringMatching(
          /Request\[repository\] successful, query: [\s\S]*, variables: [\s\S]*, data: [\s\S]*/
        )
      )
    })

    it('should handle GraphqlResponseError', async () => {
      const clientMock = jest.spyOn(client, 'graphqlClient').mockReturnValue(
        graphql.defaults({
          request: {
            fetch: fetchMock.sandbox().post('https://api.github.com/graphql', {
              errors: [{ message: 'GraphQL error' }],
              data: null,
            }),
          },
        })
      )
      const errorMock = jest.spyOn(core, 'error').mockReturnValue()
      const debugMock = jest.spyOn(core, 'debug').mockReturnValue()

      await expect(getRepository('owner', 'repo', 'branch')).rejects.toThrow(
        'GraphQL error'
      )
      expect(clientMock).toHaveBeenCalled()
      expect(errorMock).toHaveBeenCalledWith(
        'Request failed due to following response errors:\n - GraphQL error'
      )
      expect(debugMock).toHaveBeenCalledWith(
        expect.stringMatching(
          /Request\[repository\] failed, query: [\s\S]*, variables: [\s\S]*, data: [\s\S]*/
        )
      )
    })
  })

  describe('createCommitOrTag', () => {
    it('should create a commit on the given branch', async () => {
      jest.spyOn(core, 'getInput').mockImplementation((name, options) => {
        return name === 'commit-message' ? 'fake commit message' : ''
      })
      const clientMock = jest.spyOn(client, 'graphqlClient').mockReturnValue(
        graphql.defaults({
          request: {
            fetch: fetchMock.sandbox().post('https://api.github.com/graphql', {
              data: {
                createCommitOnBranch: {
                  commit: {
                    oid: 'commit-id',
                    __typename: 'Commit',
                  },
                  __typename: 'CreateCommitOnBranchPayload',
                },
              },
            }),
          },
        })
      )
      const debugMock = jest.spyOn(core, 'debug').mockReturnValue()

      const branch = {} as CommittableBranch
      const currentCommit = {} as Commit
      const fileChanges = {} as FileChanges
      await expect(
        createCommitOrTag(currentCommit, { branch, fileChanges })
      ).resolves.toHaveProperty('createCommitOnBranch.commit.oid', 'commit-id')

      expect(clientMock).toHaveBeenCalled()
      expect(debugMock).toHaveBeenCalledWith(
        expect.stringMatching(
          /Request\[createCommitOrTag\] successful, query: [\s\S]*, variables: [\s\S]*, data: [\s\S]*/
        )
      )
    })
    it('should handle GraphqlResponseError', async () => {
      const clientMock = jest.spyOn(client, 'graphqlClient').mockReturnValue(
        graphql.defaults({
          request: {
            fetch: fetchMock.sandbox().post('https://api.github.com/graphql', {
              errors: [{ message: 'GraphQL error' }],
              data: null,
            }),
          },
        })
      )
      const errorMock = jest.spyOn(core, 'error').mockReturnValue()
      const debugMock = jest.spyOn(core, 'debug').mockReturnValue()

      const branch = {} as CommittableBranch
      const currentCommit = {} as Commit
      const fileChanges = {} as FileChanges
      await expect(
        createCommitOrTag(currentCommit, { branch, fileChanges })
      ).rejects.toThrow('GraphQL error')

      expect(clientMock).toHaveBeenCalled()
      expect(errorMock).toHaveBeenCalledWith(
        'Request failed due to following response errors:\n - GraphQL error'
      )
      expect(debugMock).toHaveBeenCalledWith(
        expect.stringMatching(
          /Request\[createCommitOrTag\] failed, query: [\s\S]*, variables: [\s\S]*, data: [\s\S]*/
        )
      )
    })
    it('should populate file changes content', async () => {
      const fileAddition: FileAddition = {
        path: 'my_commit.txt',
        contents: 'initial commit content',
      }
      const fileChanges: FileChanges = {
        additions: [fileAddition],
      }
      const blobMock = new blob.Blob(fileAddition.path)
      jest.spyOn(blobMock, 'load').mockResolvedValue(fileAddition)
      jest
        .spyOn(blob, 'getBlob')
        .mockImplementation((file: any): any => blobMock)

      const clientMock = jest.spyOn(client, 'graphqlClient').mockReturnValue(
        graphql.defaults({
          request: {
            fetch: fetchMock
              .sandbox()
              .post(
                'https://api.github.com/graphql',
                (_url, options: RequestOptions) => {
                  const body = JSON.parse(options.body)
                  expect(body.query).toEqual(
                    expect.stringMatching(
                      /mutation(.+CreateCommitOnBranchInput)/
                    )
                  )

                  expect(body.variables).toHaveProperty(
                    'commitInput.branch.repositoryNameWithOwner',
                    'my-user/my-repo'
                  )
                  expect(body.variables).toHaveProperty(
                    'commitInput.branch.branchName',
                    'my-branch'
                  )
                  expect(body.variables).toHaveProperty(
                    'commitInput.expectedHeadOid'
                  )
                  expect(body.variables.commitInput.expectedHeadOid).toContain(
                    'MyOid'
                  )
                  expect(body.variables).toHaveProperty(
                    'commitInput.fileChanges.additions'
                  )
                  const additions =
                    body.variables.commitInput.fileChanges.additions
                  expect(additions).toContainEqual(fileAddition)

                  return { data: {} }
                }
              ),
          },
        })
      )

      const branch = {
        repositoryNameWithOwner: 'my-user/my-repo',
        branchName: 'my-branch',
      } as CommittableBranch
      const currentCommit = { oid: 'MyOid' } as Commit
      const result = await createCommitOrTag(currentCommit, {
        branch,
        fileChanges,
      })
      expect(clientMock).toHaveBeenCalled()
    })
  })
})
