import * as core from '@actions/core'
import * as github from '@actions/github'
import { describe, jest, beforeEach, it, expect } from '@jest/globals'
import * as main from '../src/main'
import * as git from '../src/git'
import * as repo from '../src/github/repo'
import * as graphql from '../src/github/graphql'
import { RepositoryWithCommitHistory } from '../src/github/types'
import {
  CreateCommitOnBranchPayload,
  CreateRefPayload,
} from '@octokit/graphql-schema'
import exp from 'constants'

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(core, 'debug').mockReturnValue()
    jest.spyOn(core, 'info').mockReturnValue()
    jest.spyOn(core, 'group').mockImplementation(async (name, fn) => {
      return await fn()
    })
    jest.spyOn(repo, 'getContext').mockReturnValue({
      repo: 'my-repo',
      owner: 'my-user',
      branch: 'main',
    })
    jest.spyOn(graphql, 'getRepository').mockResolvedValue({
      ref: { target: { history: { nodes: [{ oid: 'one commit' }] } } },
    } as RepositoryWithCommitHistory)
  })

  it('fails when neither files nor tag input is provided', async () => {
    jest.spyOn(core, 'getMultilineInput').mockReturnValue([])
    jest.spyOn(core, 'getInput').mockReturnValue('')
    const setFailedMock = jest.spyOn(core, 'setFailed').mockReturnValue()

    await main.run()

    expect(setFailedMock).toHaveBeenCalledWith(
      'Neither files nor tag input has been configured'
    )
  })

  describe('no file changes', () => {
    beforeEach(() => {
      jest.spyOn(core, 'getInput').mockImplementation((name, _option) => {
        if (name == 'tag') return 'no-file-tag'
        return ''
      })
    })

    describe('when tag only if files changes', () => {
      beforeEach(() => {
        jest
          .spyOn(core, 'getBooleanInput')
          .mockImplementation((name, _option) => {
            if (name == 'tag-only-if-file-changes') return true
            return false
          })
      })

      it('skip tag commit', async () => {
        jest
          .spyOn(core, 'getMultilineInput')
          .mockImplementation((name, _option) => {
            if (name == 'files') return ['/test.txt']
            return []
          })
        const addFilesMock = jest
          .spyOn(git, 'addFileChanges')
          .mockResolvedValue()
        const getFilesMock = jest
          .spyOn(git, 'getFileChanges')
          .mockResolvedValue({})
        const createCommitMock = jest.spyOn(graphql, 'createCommitOnBranch')
        const createTagMock = jest.spyOn(graphql, 'createTagOnCommit')
        const noticeMock = jest.spyOn(core, 'notice').mockReturnValue()
        const setFailedMock = jest.spyOn(core, 'setFailed').mockReturnValue()

        await main.run()

        expect(addFilesMock).toHaveBeenCalled()
        expect(getFilesMock).toHaveBeenCalled()
        expect(createCommitMock).not.toHaveBeenCalled()
        expect(createTagMock).not.toHaveBeenCalled()
        expect(noticeMock).toHaveBeenCalledWith('No files changes')
        expect(setFailedMock).not.toHaveBeenCalled()
      })
    })

    describe('when tag without files changes', () => {
      beforeEach(() => {
        jest
          .spyOn(core, 'getBooleanInput')
          .mockImplementation((name, _option) => {
            if (name == 'tag-only-if-file-changes') return false
            return true
          })
      })

      it('proceed with tag commit', async () => {
        jest
          .spyOn(core, 'getMultilineInput')
          .mockImplementation((name, _option) => {
            if (name == 'files') return ['/test.txt']
            return []
          })
        const addFilesMock = jest
          .spyOn(git, 'addFileChanges')
          .mockResolvedValue()
        const getFilesMock = jest
          .spyOn(git, 'getFileChanges')
          .mockResolvedValue({})
        const createCommitMock = jest.spyOn(graphql, 'createCommitOnBranch')
        const createTagMock = jest
          .spyOn(graphql, 'createTagOnCommit')
          .mockResolvedValue({
            ref: { name: 'fake-file-tag' },
          } as CreateRefPayload)
        const noticeMock = jest.spyOn(core, 'notice').mockReturnValue()
        const setFailedMock = jest.spyOn(core, 'setFailed').mockReturnValue()

        await main.run()

        expect(addFilesMock).toHaveBeenCalled()
        expect(getFilesMock).toHaveBeenCalled()
        expect(createCommitMock).not.toHaveBeenCalled()
        expect(createTagMock).toHaveBeenCalled()
        expect(noticeMock).toHaveBeenCalledWith('No files changes')
        expect(setFailedMock).not.toHaveBeenCalled()
      })
    })
  })

  describe('input branch same as current branch', () => {
    beforeEach(() => {
      jest.spyOn(core, 'getInput').mockImplementation((name, option) => {
        if (name == 'branch-name') return 'main'
        return ''
      })
    })

    it('does not switch branch', async () => {
      const switchBranchMock = jest
        .spyOn(git, 'switchBranch')
        .mockRejectedValue(new Error('unreachable'))
      const setFailedMock = jest.spyOn(core, 'setFailed').mockReturnValue()

      await main.run()

      expect(switchBranchMock).not.toHaveBeenCalled()
      expect(setFailedMock).not.toHaveBeenCalled()
    })

    it('does not push branch', async () => {
      const switchBranchMock = jest
        .spyOn(git, 'switchBranch')
        .mockResolvedValue()
      const pushBranchMock = jest
        .spyOn(git, 'pushCurrentBranch')
        .mockResolvedValue()
      const setFailedMock = jest.spyOn(core, 'setFailed').mockReturnValue()

      await main.run()

      expect(switchBranchMock).not.toHaveBeenCalled()
      expect(pushBranchMock).not.toHaveBeenCalled()
      expect(setFailedMock).not.toHaveBeenCalled()
    })
  })

  describe('input branch not the same as current branch', () => {
    beforeEach(() => {
      jest.spyOn(core, 'getInput').mockImplementation((name, option) => {
        if (name == 'branch-name') return 'another-branch'
        return ''
      })
    })

    it('switches branch', async () => {
      const switchBranchMock = jest
        .spyOn(git, 'switchBranch')
        .mockRejectedValue(new Error('target not the same as current'))
      const setFailedMock = jest.spyOn(core, 'setFailed').mockReturnValue()

      await main.run()

      expect(switchBranchMock).toHaveBeenCalledWith('another-branch')
      expect(setFailedMock).toHaveBeenCalledWith(
        'target not the same as current'
      )
    })

    it('push branch', async () => {
      const switchBranchMock = jest
        .spyOn(git, 'switchBranch')
        .mockResolvedValue()
      const pushBranchMock = jest
        .spyOn(git, 'pushCurrentBranch')
        .mockResolvedValue()
      const setFailedMock = jest.spyOn(core, 'setFailed').mockReturnValue()

      await main.run()

      expect(switchBranchMock).toHaveBeenCalled()
      expect(pushBranchMock).toHaveBeenCalled()
      expect(setFailedMock).not.toHaveBeenCalled()
    })
  })

  it('requires branch-name input to exists when specified', async () => {
    jest.spyOn(core, 'getInput').mockImplementation((name, option) => {
      if (name == 'branch-name') return 'new-branch'
      return ''
    })
    jest.spyOn(core, 'getMultilineInput').mockReturnValue(['/test.txt'])
    jest.spyOn(git, 'switchBranch').mockResolvedValue()
    jest.spyOn(git, 'addFileChanges').mockResolvedValue()
    jest.spyOn(git, 'getFileChanges').mockResolvedValue({
      additions: [{ path: '/test.txt', contents: '' }],
    })

    const getRepositoryMock = jest
      .spyOn(graphql, 'getRepository')
      .mockResolvedValue({} as RepositoryWithCommitHistory)
    const pushBranchMock = jest
      .spyOn(git, 'pushCurrentBranch')
      .mockResolvedValue()
    const setFailedMock = jest.spyOn(core, 'setFailed').mockReturnValue()

    await main.run()

    expect(getRepositoryMock).toHaveBeenCalled()
    expect(setFailedMock).toHaveBeenCalledWith(
      'Input <branch-name> "new-branch" not found'
    )
  })

  it('commit files and output commit sha', async () => {
    jest.spyOn(core, 'getInput').mockImplementation((name, option) => {
      if (name == 'branch-name') return 'custom-branch'
      return ''
    })
    jest.spyOn(core, 'getMultilineInput').mockReturnValue(['/test.txt'])
    jest.spyOn(git, 'addFileChanges').mockResolvedValue()
    jest.spyOn(git, 'getFileChanges').mockResolvedValue({
      additions: [{ path: '/test.txt', contents: '' }],
    })

    const switchBranchMock = jest.spyOn(git, 'switchBranch').mockResolvedValue()
    const getRepositoryMock = jest
      .spyOn(graphql, 'getRepository')
      .mockResolvedValue({
        ref: {
          name: 'custom-branch',
          target: {
            history: {
              nodes: [
                {
                  oid: 'current-commit-oid',
                  message: 'another message',
                  committedDate: '2024-08-19T04:53:47Z',
                },
              ],
            },
          },
        },
      } as RepositoryWithCommitHistory)
    const pushBranchMock = jest
      .spyOn(git, 'pushCurrentBranch')
      .mockResolvedValue()
    const createCommitMock = jest
      .spyOn(graphql, 'createCommitOnBranch')
      .mockResolvedValue({
        commit: { oid: 'my-commit-sha' },
      } as CreateCommitOnBranchPayload)
    const setOutputMock = jest.spyOn(core, 'setOutput').mockReturnValue()

    await main.run()

    expect(switchBranchMock).toHaveBeenCalled()
    expect(getRepositoryMock).toHaveBeenCalled()
    expect(pushBranchMock).toHaveBeenCalled()
    expect(createCommitMock).toHaveBeenCalled()
    expect(setOutputMock).toHaveBeenCalledWith('commit-sha', 'my-commit-sha')
  })

  it('push tag only', async () => {
    jest.spyOn(core, 'getInput').mockImplementation((name, option) => {
      if (name == 'branch-name') return 'tag-branch'
      if (name == 'tag') return 'fake-tag'
      return ''
    })
    jest.spyOn(core, 'getMultilineInput').mockReturnValue([])

    const switchBranchMock = jest.spyOn(git, 'switchBranch').mockResolvedValue()
    const getRepositoryMock = jest
      .spyOn(graphql, 'getRepository')
      .mockResolvedValue({
        ref: {
          name: 'tag-branch',
          target: {
            history: {
              nodes: [
                {
                  oid: 'tag-commit-oid',
                  message: 'tag message',
                  committedDate: '2024-08-19T04:53:47Z',
                },
              ],
            },
          },
        },
      } as RepositoryWithCommitHistory)
    const pushBranchMock = jest
      .spyOn(git, 'pushCurrentBranch')
      .mockResolvedValue()
    const createTagMock = jest
      .spyOn(graphql, 'createTagOnCommit')
      .mockResolvedValue({
        ref: { name: 'fake-tag' },
      } as CreateRefPayload)
    const setFailedMock = jest.spyOn(core, 'setFailed').mockReturnValue()

    await main.run()

    expect(switchBranchMock).toHaveBeenCalled()
    expect(getRepositoryMock).toHaveBeenCalled()
    expect(pushBranchMock).toHaveBeenCalled()
    expect(createTagMock).toHaveBeenCalled()
    expect(setFailedMock).not.toHaveBeenCalled()
  })

  it('commit file and push tag', async () => {
    jest.spyOn(core, 'getInput').mockImplementation((name, option) => {
      if (name == 'branch-name') return 'file-tag-branch'
      if (name == 'tag') return 'fake-file-tag'
      return ''
    })
    jest.spyOn(core, 'getMultilineInput').mockReturnValue(['/test.txt'])
    jest.spyOn(git, 'addFileChanges').mockResolvedValue()
    jest.spyOn(git, 'getFileChanges').mockResolvedValue({
      additions: [{ path: '/test.txt', contents: '' }],
    })

    const switchBranchMock = jest.spyOn(git, 'switchBranch').mockResolvedValue()
    const getRepositoryMock = jest
      .spyOn(graphql, 'getRepository')
      .mockResolvedValue({
        ref: {
          name: 'file-tag-branch',
          target: {
            history: {
              nodes: [
                {
                  oid: 'file-tag-commit-oid',
                  message: 'file tag message',
                  committedDate: '2024-08-19T04:53:47Z',
                },
              ],
            },
          },
        },
      } as RepositoryWithCommitHistory)
    const pushBranchMock = jest
      .spyOn(git, 'pushCurrentBranch')
      .mockResolvedValue()
    const createCommitMock = jest
      .spyOn(graphql, 'createCommitOnBranch')
      .mockResolvedValue({
        commit: { oid: 'fake-commit-sha' },
      } as CreateCommitOnBranchPayload)
    const createTagMock = jest
      .spyOn(graphql, 'createTagOnCommit')
      .mockResolvedValue({
        ref: { name: 'fake-file-tag' },
      } as CreateRefPayload)
    const setOutputMock = jest.spyOn(core, 'setOutput').mockReturnValue()

    await main.run()

    expect(switchBranchMock).toHaveBeenCalled()
    expect(getRepositoryMock).toHaveBeenCalled()
    expect(pushBranchMock).toHaveBeenCalled()
    expect(createCommitMock).toHaveBeenCalled()
    expect(createTagMock).toHaveBeenCalled()
    expect(setOutputMock).toHaveBeenCalledWith('commit-sha', 'fake-commit-sha')
  })

  it('commit file fails woukd skip push tag', async () => {
    jest.spyOn(core, 'getInput').mockImplementation((name, option) => {
      if (name == 'branch-name') return 'file-fail-tag-branch'
      if (name == 'tag') return 'unreachable-tag'
      return ''
    })
    jest.spyOn(core, 'getMultilineInput').mockReturnValue(['/test.txt'])
    jest.spyOn(git, 'addFileChanges').mockResolvedValue()
    jest.spyOn(git, 'getFileChanges').mockResolvedValue({
      additions: [{ path: '/test.txt', contents: '' }],
    })

    const switchBranchMock = jest.spyOn(git, 'switchBranch').mockResolvedValue()
    const getRepositoryMock = jest
      .spyOn(graphql, 'getRepository')
      .mockResolvedValue({
        ref: {
          name: 'file-fail-tag-branch',
          target: {
            history: {
              nodes: [
                {
                  oid: 'file-fail-tag-commit-oid',
                  message: 'file fail tag message',
                  committedDate: '2024-08-19T04:53:47Z',
                },
              ],
            },
          },
        },
      } as RepositoryWithCommitHistory)
    const pushBranchMock = jest
      .spyOn(git, 'pushCurrentBranch')
      .mockResolvedValue()
    const createCommitMock = jest
      .spyOn(graphql, 'createCommitOnBranch')
      .mockRejectedValue(new Error('Fail to commit files'))
    const createTagMock = jest.spyOn(graphql, 'createTagOnCommit')
    const setOutputMock = jest.spyOn(core, 'setOutput').mockReturnValue()
    const setFailedMock = jest.spyOn(core, 'setFailed').mockReturnValue()

    await main.run()

    expect(switchBranchMock).toHaveBeenCalled()
    expect(getRepositoryMock).toHaveBeenCalled()
    expect(pushBranchMock).toHaveBeenCalled()
    expect(createCommitMock).toHaveBeenCalled()
    expect(createTagMock).not.toHaveBeenCalled()
    expect(setOutputMock).not.toHaveBeenCalled()
    expect(setFailedMock).toHaveBeenCalledWith('Fail to commit files')
  })
})
