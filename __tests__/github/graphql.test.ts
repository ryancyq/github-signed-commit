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
import {
  getRepository,
  createCommitOnBranch,
  createTagOnCommit,
} from '../../src/github/graphql'

describe('GitHub API', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    fetchMock.clearHistory()
    fetchMock.removeRoutes()
  })

  describe('getRepository', () => {
    it('should fetch repository details', async () => {
      const clientMock = jest
        .spyOn(client, 'graphqlClient')
        .mockReturnValue(
          graphql.defaults({ request: { fetch: fetchMock.fetchHandler } })
        )
      fetchMock.post('https://api.github.com/graphql', {
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
      })
      const debugMock = jest.spyOn(core, 'debug').mockReturnValue()

      const repo = await getRepository('owner', 'repo', 'custom-branch')
      expect(clientMock).toHaveBeenCalled()
      const calls = fetchMock.callHistory.calls(
        'https://api.github.com/graphql'
      )
      expect(calls.length).toBe(1)
      const body = JSON.parse(calls[0].options.body!.toString())
      expect(body.query).toEqual(
        expect.stringMatching(/query(.+\$owner.+\$repo.+\$ref)/)
      )

      expect(body.variables).toHaveProperty('owner', 'owner')
      expect(body.variables).toHaveProperty('repo', 'repo')
      expect(body.variables).toHaveProperty('ref', 'refs/heads/custom-branch')

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
          /request: GetRepository, status: success, query: [\s\S]*, variables: [\s\S]*, data: [\s\S]*/
        )
      )
    })

    it('should handle GraphqlResponseError', async () => {
      const clientMock = jest
        .spyOn(client, 'graphqlClient')
        .mockReturnValue(
          graphql.defaults({ request: { fetch: fetchMock.fetchHandler } })
        )
      fetchMock.post('https://api.github.com/graphql', {
        errors: [{ message: 'GraphQL error' }],
        data: null,
      })
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
          /request: GetRepository, status: failed, query: [\s\S]*, variables: [\s\S]*, data: [\s\S]*/
        )
      )
    })
  })

  describe('createCommitOnBranch', () => {
    it('should create a commit on the given branch', async () => {
      const clientMock = jest
        .spyOn(client, 'graphqlClient')
        .mockReturnValue(
          graphql.defaults({ request: { fetch: fetchMock.fetchHandler } })
        )
      fetchMock.post('https://api.github.com/graphql', {
        data: {
          createCommitOnBranch: {
            commit: {
              oid: 'commit-id',
              message: 'fake commit message',
              committedDate: '2024-08-19T04:53:47Z',
              __typename: 'Commit',
            },
            __typename: 'CreateCommitOnBranchPayload',
          },
        },
      })
      const debugMock = jest.spyOn(core, 'debug').mockReturnValue()

      const branch = {} as CommittableBranch
      const currentCommit = {} as Commit
      const fileChanges = {} as FileChanges
      await expect(
        createCommitOnBranch(
          currentCommit,
          'fake commit message',
          branch,
          fileChanges
        )
      ).resolves.toHaveProperty('commit.oid', 'commit-id')

      expect(clientMock).toHaveBeenCalled()
      expect(debugMock).toHaveBeenCalledWith(
        expect.stringMatching(
          /request: CreateCommitOnBranch, status: success, query: [\s\S]*, variables: [\s\S]*, data: [\s\S]*/
        )
      )
    })

    it('should handle GraphqlResponseError', async () => {
      const clientMock = jest.spyOn(client, 'graphqlClient').mockReturnValue(
        graphql.defaults({
          request: { fetch: fetchMock.fetchHandler },
        })
      )
      fetchMock.post('https://api.github.com/graphql', {
        errors: [{ message: 'GraphQL error' }],
        data: null,
      })
      const errorMock = jest.spyOn(core, 'error').mockReturnValue()
      const debugMock = jest.spyOn(core, 'debug').mockReturnValue()

      const branch = {} as CommittableBranch
      const currentCommit = {} as Commit
      const fileChanges = {} as FileChanges
      await expect(
        createCommitOnBranch(
          currentCommit,
          'random commit message',
          branch,
          fileChanges
        )
      ).rejects.toThrow('GraphQL error')

      expect(clientMock).toHaveBeenCalled()
      expect(errorMock).toHaveBeenCalledWith(
        'Request failed due to following response errors:\n - GraphQL error'
      )
      expect(debugMock).toHaveBeenCalledWith(
        expect.stringMatching(
          /request: CreateCommitOnBranch, status: failed, query: [\s\S]*, variables: [\s\S]*, data: [\s\S]*/
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
          request: { fetch: fetchMock.fetchHandler },
        })
      )
      fetchMock.post('https://api.github.com/graphql', { data: {} })

      const branch = {
        repositoryNameWithOwner: 'my-user/my-repo',
        branchName: 'my-branch',
      } as CommittableBranch
      const currentCommit = { oid: 'MyOid' } as Commit
      const result = await createCommitOnBranch(
        currentCommit,
        'new file content',
        branch,
        fileChanges
      )
      expect(clientMock).toHaveBeenCalled()
      const calls = fetchMock.callHistory.calls(
        'https://api.github.com/graphql'
      )
      expect(calls.length).toBe(1)
      const body = JSON.parse(calls[0].options.body!.toString())
      expect(body.query).toEqual(
        expect.stringMatching(/mutation(.+CreateCommitOnBranchInput)/)
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
        'commitInput.expectedHeadOid',
        'MyOid'
      )
      expect(body.variables).toHaveProperty(
        'commitInput.message.headline',
        'new file content'
      )
      expect(body.variables).toHaveProperty('commitInput.fileChanges.additions')
      const additions = body.variables.commitInput.fileChanges.additions
      expect(additions).toContainEqual(fileAddition)
    })
  })

  describe('createTagOnCommit', () => {
    it('should create a tag on the given commit', async () => {
      const clientMock = jest.spyOn(client, 'graphqlClient').mockReturnValue(
        graphql.defaults({
          request: { fetch: fetchMock.fetchHandler },
        })
      )
      fetchMock.post('https://api.github.com/graphql', {
        data: {
          createRef: {
            ref: {
              name: 'refs/tags/faked-tag',
              __typename: 'Ref',
            },
            __typename: 'CreateRefPayload',
          },
        },
      })
      const debugMock = jest.spyOn(core, 'debug').mockReturnValue()

      const currentCommit = {} as Commit
      await expect(
        createTagOnCommit(currentCommit, 'fake-tag', 'my-repository-id')
      ).resolves.toHaveProperty('ref.name', 'refs/tags/faked-tag')

      expect(clientMock).toHaveBeenCalled()
      expect(debugMock).toHaveBeenCalledWith(
        expect.stringMatching(
          /request: CreateTagOnCommit, status: success, query: [\s\S]*, variables: [\s\S]*, data: [\s\S]*/
        )
      )
    })

    it('should handle GraphqlResponseError', async () => {
      const clientMock = jest.spyOn(client, 'graphqlClient').mockReturnValue(
        graphql.defaults({
          request: { fetch: fetchMock.fetchHandler },
        })
      )
      fetchMock.post('https://api.github.com/graphql', {
        errors: [{ message: 'GraphQL error' }],
        data: null,
      })
      const errorMock = jest.spyOn(core, 'error').mockReturnValue()
      const debugMock = jest.spyOn(core, 'debug').mockReturnValue()

      const currentCommit = {} as Commit
      await expect(
        createTagOnCommit(
          currentCommit,
          'fake-another-tag',
          'another-repository-id'
        )
      ).rejects.toThrow('GraphQL error')

      expect(clientMock).toHaveBeenCalled()
      expect(errorMock).toHaveBeenCalledWith(
        'Request failed due to following response errors:\n - GraphQL error'
      )
      expect(debugMock).toHaveBeenCalledWith(
        expect.stringMatching(
          /request: CreateTagOnCommit, status: failed, query: [\s\S]*, variables: [\s\S]*, data: [\s\S]*/
        )
      )
    })

    it('should populate tag content', async () => {
      const clientMock = jest.spyOn(client, 'graphqlClient').mockReturnValue(
        graphql.defaults({
          request: { fetch: fetchMock.fetchHandler },
        })
      )
      fetchMock.post('https://api.github.com/graphql', { data: {} })

      const currentCommit = { oid: 'MyOid' } as Commit
      const result = await createTagOnCommit(
        currentCommit,
        'my-tag',
        'my-repo-id'
      )
      expect(clientMock).toHaveBeenCalled()
      const calls = fetchMock.callHistory.calls(
        'https://api.github.com/graphql'
      )
      expect(calls.length).toBe(1)
      const body = JSON.parse(calls[0].options.body!.toString())
      expect(body.query).toEqual(
        expect.stringMatching(/mutation(.+CreateRefInput)/)
      )

      expect(body.variables).toHaveProperty(
        'tagInput.repositoryId',
        'my-repo-id'
      )
      expect(body.variables).toHaveProperty('tagInput.name', 'refs/tags/my-tag')
      expect(body.variables).toHaveProperty('tagInput.oid', 'MyOid')
    })
  })
})
