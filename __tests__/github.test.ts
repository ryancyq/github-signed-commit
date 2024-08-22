import * as core from '@actions/core'
import fetchMock from 'fetch-mock'
import { Readable } from 'node:stream'
import { describe, jest, beforeEach, it, expect } from '@jest/globals'
import { graphql, GraphqlResponseError } from '@octokit/graphql'
import {
  Repository,
  CreateCommitOnBranchPayload,
  FileChanges,
  CommittableBranch,
} from '@octokit/graphql-schema'
import * as client from '../src/github-client'
import { getRepository, createCommitOnBranch } from '../src/github'

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
            fetch: fetchMock.sandbox().post('https://api.github.com/graphql', {
              data: {
                repository: {
                  id: 'repo-id',
                  defaultBranchRef: {
                    name: 'main',
                  },
                  __typename: 'Repository',
                },
              },
            }),
          },
        })
      })

      const repo = await getRepository('owner', 'repo')
      expect(repo).toHaveProperty('id', 'repo-id')
      expect(repo).toHaveProperty('defaultBranchRef.name', 'main')
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
      const mockError = jest.spyOn(core, 'error')
      const mockDebug = jest.spyOn(core, 'debug')

      await expect(getRepository('owner', 'repo')).rejects.toThrow(
        'GraphQL error'
      )
      expect(mockError).toHaveBeenCalledWith(
        'Request failed due to following response errors:\n - GraphQL error'
      )
      expect(mockDebug).toHaveBeenCalledWith(
        expect.stringMatching(
          /Request failed, query: [\s\S]*, variables: [\s\S]*/
        )
      )
    })
  })

  describe('createCommitOnBranch', () => {
    let mockGetInput: jest.SpiedFunction<typeof core.getInput>

    beforeEach(() => {
      mockGetInput = jest
        .spyOn(core, 'getInput')
        .mockImplementation((name, options) => {
          return name === 'commit-message' ? 'fake commit message' : ''
        })
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

      const fileChanges: FileChanges = {}
      const branch: CommittableBranch = {}
      const result = await createCommitOnBranch(branch, fileChanges)
      expect(mockClient).toBeCalled()
      expect(result).toHaveProperty('commit.id', 'commit-id')
    })

    it('should populate file changes content', async () => {
      const fileChanges: FileChanges = {
        additions: [
          { path: 'my_commit.txt', contents: 'initial commit content' },
        ],
      }
      const branch: CommittableBranch = {}
      const result = await createCommitOnBranch(branch, fileChanges)
      expect(mockClient).toBeCalled()
    })
  })
})
