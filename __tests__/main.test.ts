import * as core from '@actions/core'
import * as github from '@actions/github'
import { describe, jest, beforeEach, it, expect } from '@jest/globals'
import * as main from '../src/main'
import * as git from '../src/git'
import * as graphql from '../src/github/graphql'
import { RepositoryWithCommitHistory } from '../src/github/types'
import { CreateCommitOnBranchPayload } from '@octokit/graphql-schema'

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sets a failed status', async () => {
    const runMock = jest.spyOn(main, 'run')
    jest.spyOn(core, 'getMultilineInput').mockImplementation(() => {
      throw new Error('My Error')
    })
    const errorMock = jest.spyOn(core, 'error').mockReturnValue()
    const setFailedMock = jest.spyOn(core, 'setFailed').mockReturnValue()

    await main.run()

    expect(runMock).toHaveReturned()
    expect(setFailedMock).toHaveBeenCalledWith('My Error')
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('requires files input', async () => {
    jest.spyOn(core, 'getMultilineInput').mockReturnValue([])
    const setFailedMock = jest.spyOn(core, 'setFailed').mockReturnValue()

    await main.run()

    expect(setFailedMock).toHaveBeenCalledWith('Input <files> is required')
  })

  it('does not fail when no file changes', async () => {
    jest.spyOn(core, 'getMultilineInput').mockReturnValue(['/test.txt'])
    const addFilesMock = jest
      .spyOn(git, 'addFileChanges')
      .mockReturnValue(Promise.resolve())
    const getFilesMock = jest
      .spyOn(git, 'getFileChanges')
      .mockReturnValue(Promise.resolve({}))
    const noticeMock = jest.spyOn(core, 'notice').mockReturnValue()

    await main.run()

    expect(addFilesMock).toHaveBeenCalled()
    expect(getFilesMock).toHaveBeenCalled()
    expect(noticeMock).toHaveBeenCalledWith('No changes found')
  })

  it('requires ref input to exists', async () => {
    jest.spyOn(core, 'getInput').mockReturnValue('new-branch')
    jest.spyOn(core, 'getMultilineInput').mockReturnValue(['/test.txt'])
    jest.spyOn(git, 'addFileChanges').mockReturnValue(Promise.resolve())
    jest
      .spyOn(git, 'getFileChanges')
      .mockReturnValue(
        Promise.resolve({ additions: [{ path: '/test.txt', contents: '' }] })
      )
    const githubContextMock = jest
      .spyOn(github.context, 'repo', 'get')
      .mockReturnValue({ repo: 'B', owner: 'A' })
    const getRepositoryMock = jest
      .spyOn(graphql, 'getRepository')
      .mockReturnValue(Promise.resolve({} as RepositoryWithCommitHistory))

    jest.spyOn(core, 'debug').mockReturnValue()
    jest.spyOn(core, 'group').mockImplementation(async (name, fn) => {
      return await fn()
    })

    const setFailedMock = jest.spyOn(core, 'setFailed').mockReturnValue()

    await main.run()

    expect(githubContextMock).toHaveBeenCalled()
    expect(getRepositoryMock).toHaveBeenCalled()
    expect(setFailedMock).toHaveBeenCalledWith(
      'Input <ref> "new-branch" not found'
    )
  })

  it('set commit sha to output', async () => {
    jest.spyOn(core, 'getInput').mockReturnValue('new-branch')
    jest.spyOn(core, 'getMultilineInput').mockReturnValue(['/test.txt'])
    jest.spyOn(git, 'addFileChanges').mockReturnValue(Promise.resolve())
    jest
      .spyOn(git, 'getFileChanges')
      .mockReturnValue(
        Promise.resolve({ additions: [{ path: '/test.txt', contents: '' }] })
      )
    const githubContextMock = jest
      .spyOn(github.context, 'repo', 'get')
      .mockReturnValue({ repo: 'B', owner: 'A' })
    const getRepositoryMock = jest
      .spyOn(graphql, 'getRepository')
      .mockReturnValue(
        Promise.resolve({
          ref: {
            name: 'custom-branch',
            target: {
              history: {
                nodes: [
                  {
                    oid: 'another-oid',
                    message: 'another message',
                    committedDate: '2024-08-19T04:53:47Z',
                  },
                ],
              },
            },
          },
        } as RepositoryWithCommitHistory)
      )
    const createCommitMock = jest
      .spyOn(graphql, 'createCommitOnBranch')
      .mockReturnValue(
        Promise.resolve({
          commit: { id: 'my-commit-sha' },
        } as CreateCommitOnBranchPayload)
      )

    jest.spyOn(core, 'debug').mockReturnValue()
    jest.spyOn(core, 'group').mockImplementation(async (name, fn) => {
      return await fn()
    })

    const setOutputMock = jest.spyOn(core, 'setOutput').mockReturnValue()

    await main.run()

    expect(createCommitMock).toHaveBeenCalled()
    expect(setOutputMock).toHaveBeenCalledWith('commit-sha', 'my-commit-sha')
  })
})
