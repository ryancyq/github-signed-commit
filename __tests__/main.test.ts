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
    jest
      .spyOn(github.context, 'repo', 'get')
      .mockReturnValue({ repo: 'my-repo', owner: 'my-user' })
    jest.replaceProperty(github.context, 'ref', 'refs/heads/main')
    jest.replaceProperty(github.context, 'sha', 'parent-oid')
    jest.spyOn(core, 'debug').mockReturnValue()
  })

  it('sets a failed status', async () => {
    const runMock = jest.spyOn(main, 'run')
    jest.spyOn(github.context, 'repo', 'get').mockImplementation(() => {
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
    const addFilesMock = jest.spyOn(git, 'addFileChanges').mockResolvedValue()
    const getFilesMock = jest.spyOn(git, 'getFileChanges').mockResolvedValue({})
    const noticeMock = jest.spyOn(core, 'notice').mockReturnValue()

    await main.run()

    expect(addFilesMock).toHaveBeenCalled()
    expect(getFilesMock).toHaveBeenCalled()
    expect(noticeMock).toHaveBeenCalledWith('No changes found')
  })

  it('does not switch branch if target the same as current', async () => {
    jest.spyOn(core, 'getInput').mockReturnValue('main')
    const switchBranchMock = jest
      .spyOn(git, 'switchBranch')
      .mockRejectedValue(new Error('unreachable'))

    const setFailedMock = jest.spyOn(core, 'setFailed').mockReturnValue()

    await main.run()

    expect(switchBranchMock).not.toHaveBeenCalled()
    expect(setFailedMock).not.toHaveBeenCalled()
  })

  it('switches branch if target not the same as current', async () => {
    jest.spyOn(core, 'getInput').mockReturnValue('another-branch')
    const switchBranchMock = jest
      .spyOn(git, 'switchBranch')
      .mockRejectedValue(new Error('target not the same as current'))

    const setFailedMock = jest.spyOn(core, 'setFailed').mockReturnValue()

    await main.run()

    expect(switchBranchMock).toHaveBeenCalledWith('another-branch')
    expect(setFailedMock).toHaveBeenCalledWith('target not the same as current')
  })

  it('does not push branch if target the same as current', async () => {
    jest.spyOn(core, 'getInput').mockReturnValue('main')
    jest.spyOn(core, 'getMultilineInput').mockReturnValue(['/test.txt'])
    jest.spyOn(git, 'switchBranch').mockResolvedValue()
    jest.spyOn(git, 'addFileChanges').mockResolvedValue()
    jest
      .spyOn(git, 'getFileChanges')
      .mockResolvedValue({ additions: [{ path: '/test.txt', contents: '' }] })

    const getRepositoryMock = jest
      .spyOn(graphql, 'getRepository')
      .mockResolvedValue({ ref: { target: {} } } as RepositoryWithCommitHistory)
    const pushBranchMock = jest
      .spyOn(git, 'pushCurrentBranch')
      .mockResolvedValue()
    const createCommitMock = jest
      .spyOn(graphql, 'createCommitOnBranch')
      .mockResolvedValue({} as CreateCommitOnBranchPayload)

    jest.spyOn(core, 'debug').mockReturnValue()
    jest.spyOn(core, 'group').mockImplementation(async (name, fn) => {
      return await fn()
    })

    const setFailedMock = jest.spyOn(core, 'setFailed').mockReturnValue()

    await main.run()

    expect(getRepositoryMock).toHaveBeenCalled()
    expect(pushBranchMock).not.toHaveBeenCalled()
    expect(createCommitMock).toHaveBeenCalled()
  })

  it('push branch if target no the same as current', async () => {
    jest.spyOn(core, 'getInput').mockReturnValue('new-branch')
    jest.spyOn(core, 'getMultilineInput').mockReturnValue(['/test.txt'])
    jest.spyOn(git, 'switchBranch').mockResolvedValue()
    jest.spyOn(git, 'addFileChanges').mockResolvedValue()
    jest
      .spyOn(git, 'getFileChanges')
      .mockResolvedValue({ additions: [{ path: '/test.txt', contents: '' }] })

    const getRepositoryMock = jest
      .spyOn(graphql, 'getRepository')
      .mockResolvedValue({} as RepositoryWithCommitHistory)
    const pushBranchMock = jest
      .spyOn(git, 'pushCurrentBranch')
      .mockResolvedValue()
    const createCommitMock = jest
      .spyOn(graphql, 'createCommitOnBranch')
      .mockResolvedValue({} as CreateCommitOnBranchPayload)

    jest.spyOn(core, 'debug').mockReturnValue()
    jest.spyOn(core, 'group').mockImplementation(async (name, fn) => {
      return await fn()
    })

    const setFailedMock = jest.spyOn(core, 'setFailed').mockReturnValue()

    await main.run()

    expect(getRepositoryMock).toHaveBeenCalled()
    expect(pushBranchMock).toHaveBeenCalled()
    expect(createCommitMock).toHaveBeenCalled()
  })

  it('set commit sha to output', async () => {
    jest.spyOn(core, 'getInput').mockReturnValue('custom-branch')
    jest.spyOn(git, 'switchBranch').mockResolvedValue()
    jest.spyOn(core, 'getMultilineInput').mockReturnValue(['/test.txt'])
    jest.spyOn(git, 'addFileChanges').mockResolvedValue()
    jest
      .spyOn(git, 'getFileChanges')
      .mockResolvedValue({ additions: [{ path: '/test.txt', contents: '' }] })
    const getRepositoryMock = jest
      .spyOn(graphql, 'getRepository')
      .mockResolvedValue({
        ref: {
          name: 'custom-branch',
          target: {
            history: {
              nodes: [
                {
                  oid: 'parent-oid',
                  message: 'another message',
                  committedDate: '2024-08-19T04:53:47Z',
                },
              ],
            },
          },
        },
      } as RepositoryWithCommitHistory)

    const createCommitMock = jest
      .spyOn(graphql, 'createCommitOnBranch')
      .mockResolvedValue({
        commit: { oid: 'my-commit-sha' },
      } as CreateCommitOnBranchPayload)

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
