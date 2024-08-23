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
import { getRepository, createCommitOnBranch } from '../../src/github/graphql'

describe('GitHub API', () => {
  let mockClient: jest.SpiedFunction<typeof client.graphqlClient>

  beforeEach(() => {
    jest.clearAllMocks()
    fetchMock.reset()
    mockClient = jest.spyOn(client, 'graphqlClient')
  })

  describe('getRepository', () => {
    it('should fetch repository details', async () => {
      mockClient.mockImplementation(() => {
        return graphql.defaults({
          request: {
            fetch: fetchMock
              .sandbox()
              .post(
                'https://api.github.com/graphql',
                (_url, options: RequestOptions) => {
                  const body = JSON.parse(options.body)
                  expect(body.query).toEqual(
                    expect.stringMatching(/query(.+\$owner.+\$repo.+\$branch)/)
                  )

                  expect(body.variables).toHaveProperty('owner', 'owner')
                  expect(body.variables).toHaveProperty('repo', 'repo')
                  expect(body.variables).toHaveProperty(
                    'branch',
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
      })
      const mockDebug = jest.spyOn(core, 'debug').mockReturnThis()

      const repo = await getRepository('owner', 'repo', 'custom-branch')
      expect(mockClient).toBeCalled()
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
      expect(mockDebug).toHaveBeenCalledWith(
        expect.stringMatching(/Request\[repository\] successful, data: [\s\S]*/)
      )
    })

    it('should handle GraphqlResponseError', async () => {
      mockClient.mockImplementation(() => {
        return graphql.defaults({
          request: {
            fetch: fetchMock.sandbox().post('https://api.github.com/graphql', {
              errors: [{ message: 'GraphQL error' }],
              data: null,
            }),
          },
        })
      })
      const mockError = jest.spyOn(core, 'error').mockReturnThis()
      const mockDebug = jest.spyOn(core, 'debug').mockReturnThis()

      await expect(getRepository('owner', 'repo', 'branch')).rejects.toThrow(
        'GraphQL error'
      )
      expect(mockClient).toBeCalled()
      expect(mockError).toHaveBeenCalledWith(
        'Request failed due to following response errors:\n - GraphQL error'
      )
      expect(mockDebug).toHaveBeenCalledWith(
        expect.stringMatching(
          /Request\[repository\] failed, query: [\s\S]*, variables: [\s\S]*, data: [\s\S]*/
        )
      )
    })
  })

  describe('createCommitOnBranch', () => {
    let mockGetInput: jest.SpiedFunction<typeof core.getInput>
    let mockGetBlob: jest.SpiedFunction<typeof blob.getBlob>

    beforeEach(() => {
      mockGetInput = jest
        .spyOn(core, 'getInput')
        .mockImplementation((name, options) => {
          return name === 'commit-message' ? 'fake commit message' : ''
        })
      mockGetBlob = jest.spyOn(blob, 'getBlob')
    })

    it('should create a commit on the given branch', async () => {
      mockClient.mockImplementation(() => {
        return graphql.defaults({
          request: {
            fetch: fetchMock.sandbox().post('https://api.github.com/graphql', {
              data: {
                createCommitOnBranch: {
                  commit: {
                    id: 'commit-id',
                    __typename: 'Commit',
                  },
                  __typename: 'CreateCommitOnBranchPayload',
                },
              },
            }),
          },
        })
      })
      const mockDebug = jest.spyOn(core, 'debug').mockReturnThis()

      const branch = {} as CommittableBranch
      const parentCommit = {} as Commit
      const fileChanges = {} as FileChanges
      const result = await createCommitOnBranch(
        branch,
        parentCommit,
        fileChanges
      )
      expect(mockClient).toBeCalled()
      expect(result).toHaveProperty('commit.id', 'commit-id')
      expect(mockDebug).toHaveBeenCalledWith(
        expect.stringMatching(
          /Request\[createCommitOnBranch\] successful, data:[\s\S]*/
        )
      )
    })
    it('should handle GraphqlResponseError', async () => {
      mockClient.mockImplementation(() => {
        return graphql.defaults({
          request: {
            fetch: fetchMock.sandbox().post('https://api.github.com/graphql', {
              errors: [{ message: 'GraphQL error' }],
              data: null,
            }),
          },
        })
      })
      const mockError = jest.spyOn(core, 'error').mockReturnThis()
      const mockDebug = jest.spyOn(core, 'debug').mockReturnThis()

      const branch = {} as CommittableBranch
      const parentCommit = {} as Commit
      const fileChanges = {} as FileChanges
      await expect(
        createCommitOnBranch(branch, parentCommit, fileChanges)
      ).rejects.toThrow('GraphQL error')

      expect(mockClient).toBeCalled()
      expect(mockError).toHaveBeenCalledWith(
        'Request failed due to following response errors:\n - GraphQL error'
      )
      expect(mockDebug).toHaveBeenCalledWith(
        expect.stringMatching(
          /Request\[createCommitOnBranch\] failed, query: [\s\S]*, variables: [\s\S]*, data: [\s\S]*/
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
      const mockBlob = new blob.Blob(fileAddition.path)
      jest
        .spyOn(mockBlob, 'load')
        .mockImplementation(async () => Promise.resolve(fileAddition))
      mockGetBlob.mockImplementation((file: any): any => mockBlob)

      mockClient.mockImplementation(() => {
        return graphql.defaults({
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
                    'input.branch.repositoryNameWithOwner',
                    'my-user/my-repo'
                  )
                  expect(body.variables).toHaveProperty(
                    'input.branch.branchName',
                    'my-branch'
                  )
                  expect(body.variables).toHaveProperty('input.expectedHeadOid')
                  expect(body.variables.input.expectedHeadOid).toContain(
                    'MyOid'
                  )

                  expect(body.variables).toHaveProperty(
                    'input.fileChanges.additions'
                  )
                  const additions = body.variables.input.fileChanges.additions
                  expect(additions).toContainEqual(fileAddition)

                  return { data: {} }
                }
              ),
          },
        })
      })

      const branch = {
        repositoryNameWithOwner: 'my-user/my-repo',
        branchName: 'my-branch',
      } as CommittableBranch
      const parentCommit = { oid: 'MyOid' } as Commit
      const result = await createCommitOnBranch(
        branch,
        parentCommit,
        fileChanges
      )
      expect(mockClient).toBeCalled()
    })
  })
})
