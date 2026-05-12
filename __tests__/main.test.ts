import * as core from '@actions/core'
import * as github from '@actions/github'
import { describe, vi, beforeEach, it, expect } from 'vitest'
import * as main from '../src/main'
import * as git from '../src/git'
import * as repo from '../src/github/repo'
import * as graphql from '../src/github/graphql'
import { RepositoryWithCommitHistory } from '../src/github/types'
import {
  CreateCommitOnBranchPayload,
  CreateRefPayload,
} from '@octokit/graphql-schema'

describe('action', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(core, 'debug').mockReturnValue()
    vi.spyOn(core, 'info').mockReturnValue()
    vi.spyOn(core, 'group').mockImplementation(async (name, fn) => {
      return await fn()
    })
    vi.spyOn(repo, 'getContext').mockReturnValue({
      repo: 'my-repo',
      owner: 'my-user',
      branch: 'main',
    })
    vi.spyOn(graphql, 'getRepository').mockResolvedValue({
      ref: { target: { history: { nodes: [{ oid: 'one commit' }] } } },
    } as RepositoryWithCommitHistory)
  })

  it('fails when neither files nor tag input is provided', async () => {
    vi.spyOn(core, 'getMultilineInput').mockReturnValue([])
    vi.spyOn(core, 'getInput').mockReturnValue('')
    const setFailedMock = vi.spyOn(core, 'setFailed').mockReturnValue()

    await main.run()

    expect(setFailedMock).toHaveBeenCalledWith(
      'Neither files nor tag input has been configured'
    )
  })

  describe('no file changes', () => {
    beforeEach(() => {
      vi.spyOn(core, 'getInput').mockImplementation((name, _option) => {
        if (name == 'tag') return 'no-file-tag'
        return ''
      })
    })

    describe('when tag only if files changes', () => {
      beforeEach(() => {
        vi.spyOn(core, 'getBooleanInput').mockImplementation(
          (name, _option) => {
            if (name == 'tag-only-if-file-changes') return true
            return false
          }
        )
        vi.spyOn(core, 'getMultilineInput').mockReturnValue(['/test.txt'])
      })

      it('skip tag commit', async () => {
        const addFilesMock = vi.spyOn(git, 'addFileChanges').mockResolvedValue()
        const getFilesMock = vi
          .spyOn(git, 'getFileChanges')
          .mockResolvedValue({})
        const createCommitMock = vi.spyOn(graphql, 'createCommitOnBranch')
        const createTagMock = vi.spyOn(graphql, 'createTagOnCommit')
        const noticeMock = vi.spyOn(core, 'notice').mockReturnValue()
        const setFailedMock = vi.spyOn(core, 'setFailed').mockReturnValue()

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
        vi.spyOn(core, 'getBooleanInput').mockImplementationOnce(
          (name, _option) => {
            if (name == 'tag-only-if-file-changes') return false
            return true
          }
        )
        vi.spyOn(core, 'getMultilineInput').mockReturnValue(['/test.txt'])
      })

      it('proceed with tag commit', async () => {
        const addFilesMock = vi.spyOn(git, 'addFileChanges').mockResolvedValue()
        const getFilesMock = vi
          .spyOn(git, 'getFileChanges')
          .mockResolvedValue({})
        const createCommitMock = vi.spyOn(graphql, 'createCommitOnBranch')
        const createTagMock = vi
          .spyOn(graphql, 'createTagOnCommit')
          .mockResolvedValue({
            ref: { name: 'fake-file-tag' },
          } as CreateRefPayload)
        const noticeMock = vi.spyOn(core, 'notice').mockReturnValue()
        const setFailedMock = vi.spyOn(core, 'setFailed').mockReturnValue()

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
      vi.spyOn(core, 'getInput').mockImplementation((name, _option) => {
        if (name == 'branch-name') return 'main'
        return ''
      })
    })

    it('does not switch branch', async () => {
      const switchBranchMock = vi
        .spyOn(git, 'switchBranch')
        .mockRejectedValue(new Error('unreachable'))
      const setFailedMock = vi.spyOn(core, 'setFailed').mockReturnValue()

      await main.run()

      expect(switchBranchMock).not.toHaveBeenCalled()
      expect(setFailedMock).toHaveBeenCalledWith(
        'Neither files nor tag input has been configured'
      )
    })

    it('does not push branch', async () => {
      const switchBranchMock = vi.spyOn(git, 'switchBranch').mockResolvedValue()
      const pushBranchMock = vi
        .spyOn(git, 'pushCurrentBranch')
        .mockResolvedValue()
      const setFailedMock = vi.spyOn(core, 'setFailed').mockReturnValue()

      await main.run()

      expect(switchBranchMock).not.toHaveBeenCalled()
      expect(pushBranchMock).not.toHaveBeenCalled()
      expect(setFailedMock).toHaveBeenCalledWith(
        'Neither files nor tag input has been configured'
      )
    })
  })

  describe('input branch not the same as current branch', () => {
    beforeEach(() => {
      vi.spyOn(core, 'getInput').mockImplementation((name, _option) => {
        if (name == 'branch-name') return 'another-branch'
        return ''
      })
    })

    it('switches branch', async () => {
      const switchBranchMock = vi
        .spyOn(git, 'switchBranch')
        .mockRejectedValue(new Error('target not the same as current'))
      const setFailedMock = vi.spyOn(core, 'setFailed').mockReturnValue()

      await main.run()

      expect(switchBranchMock).toHaveBeenCalledWith('another-branch')
      expect(setFailedMock).toHaveBeenCalledWith(
        'target not the same as current'
      )
    })

    it('push branch', async () => {
      const switchBranchMock = vi.spyOn(git, 'switchBranch').mockResolvedValue()
      const pushBranchMock = vi
        .spyOn(git, 'pushCurrentBranch')
        .mockResolvedValue()
      const setFailedMock = vi.spyOn(core, 'setFailed').mockReturnValue()

      await main.run()

      expect(switchBranchMock).toHaveBeenCalled()
      expect(pushBranchMock).toHaveBeenCalled()
      expect(setFailedMock).toHaveBeenCalledWith(
        'Neither files nor tag input has been configured'
      )
    })
  })

  describe('input repository is given', () => {
    describe('valid format', () => {
      beforeEach(() => {
        vi.spyOn(core, 'getInput').mockImplementation((name, _option) => {
          if (name == 'repository') return 'the-user/the-repo'
          return ''
        })
      })

      it('succeed', async () => {
        const setFailedMock = vi.spyOn(core, 'setFailed').mockReturnValue()
        await main.run()
        expect(setFailedMock).toHaveBeenCalledWith(
          'Neither files nor tag input has been configured'
        )
      })
    })

    describe('invalid format', () => {
      beforeEach(() => {
        vi.spyOn(core, 'getInput').mockImplementation((name, _option) => {
          if (name == 'repository') return 'the-user-the-repo'
          return ''
        })
      })

      it('fails', async () => {
        const setFailedMock = vi.spyOn(core, 'setFailed').mockReturnValue()
        await main.run()
        expect(setFailedMock).toHaveBeenCalledWith(
          'Input <repository> "the-user-the-repo" is invalid'
        )
      })
    })
  })

  describe('input branch is given', () => {
    beforeEach(() => {
      vi.spyOn(core, 'getMultilineInput').mockReturnValue(['/test.txt'])
      vi.spyOn(git, 'switchBranch').mockResolvedValue()
      vi.spyOn(git, 'pushCurrentBranch').mockResolvedValue()
      vi.spyOn(git, 'addFileChanges').mockResolvedValue()
      vi.spyOn(git, 'getFileChanges').mockResolvedValue({})
    })

    describe('exists in remote', () => {
      beforeEach(() => {
        vi.spyOn(core, 'getInput').mockImplementation((name, _option) => {
          if (name == 'branch-name') return 'existing-branch'
          return ''
        })
        vi.spyOn(core, 'getBooleanInput').mockReturnValue(true)
      })

      it('succeed', async () => {
        const getRepositoryMock = vi
          .spyOn(graphql, 'getRepository')
          .mockResolvedValue({
            ref: {
              name: 'existing-branch',
              target: {
                history: {
                  nodes: [
                    {
                      oid: 'existing-commit-oid',
                      message: 'existing message',
                      committedDate: '2024-08-19T04:53:47Z',
                    },
                  ],
                },
              },
            },
          } as RepositoryWithCommitHistory)
        const setFailedMock = vi.spyOn(core, 'setFailed').mockReturnValue()

        await main.run()

        expect(getRepositoryMock).toHaveBeenCalled()
        expect(setFailedMock).not.toHaveBeenCalled()
      })
    })

    describe('does not exist in remote', () => {
      beforeEach(() => {
        vi.spyOn(core, 'getInput').mockImplementation((name, _option) => {
          if (name == 'branch-name') return 'new-branch'
          return ''
        })
      })

      it('fails', async () => {
        const getRepositoryMock = vi
          .spyOn(graphql, 'getRepository')
          .mockResolvedValue({} as RepositoryWithCommitHistory)
        const setFailedMock = vi.spyOn(core, 'setFailed').mockReturnValue()

        await main.run()

        expect(getRepositoryMock).toHaveBeenCalled()
        expect(setFailedMock).toHaveBeenCalledWith(
          'Input <branch-name> "new-branch" not found'
        )
      })
    })
  })

  describe('workflow branch', () => {
    beforeEach(() => {
      vi.spyOn(repo, 'getContext').mockReturnValue({
        repo: 'workflow-repo',
        owner: 'workflow-user',
        branch: 'workflow-branch',
      })
      vi.spyOn(core, 'getMultilineInput').mockReturnValue(['/test.txt'])
      vi.spyOn(core, 'getBooleanInput').mockReturnValue(true)
      vi.spyOn(git, 'switchBranch').mockResolvedValue()
      vi.spyOn(git, 'pushCurrentBranch').mockResolvedValue()
      vi.spyOn(git, 'addFileChanges').mockResolvedValue()
      vi.spyOn(git, 'getFileChanges').mockResolvedValue({})
    })

    describe('exists in remote', () => {
      it('succeed', async () => {
        const getRepositoryMock = vi
          .spyOn(graphql, 'getRepository')
          .mockResolvedValue({
            ref: {
              name: 'workflow-branch',
              target: {
                history: {
                  nodes: [
                    {
                      oid: 'workflow-commit-oid',
                      message: 'existing message',
                      committedDate: '2024-08-19T04:53:47Z',
                    },
                  ],
                },
              },
            },
          } as RepositoryWithCommitHistory)
        const setFailedMock = vi.spyOn(core, 'setFailed').mockReturnValue()

        await main.run()

        expect(getRepositoryMock).toHaveBeenCalled()
        expect(setFailedMock).not.toHaveBeenCalled()
      })
    })

    describe('does not exist in remote', () => {
      it('fails', async () => {
        const getRepositoryMock = vi
          .spyOn(graphql, 'getRepository')
          .mockResolvedValue({} as RepositoryWithCommitHistory)
        const setFailedMock = vi.spyOn(core, 'setFailed').mockReturnValue()

        await main.run()

        expect(getRepositoryMock).toHaveBeenCalled()
        expect(setFailedMock).toHaveBeenCalledWith(
          'Branch "workflow-branch" not found'
        )
      })
    })

    describe('does not have commit history', () => {
      it('fails', async () => {
        const getRepositoryMock = vi
          .spyOn(graphql, 'getRepository')
          .mockResolvedValue({
            ref: {
              name: 'workflow-branch',
              target: {
                history: {
                  nodes: [] as any,
                },
              },
            },
          } as RepositoryWithCommitHistory)
        const setFailedMock = vi.spyOn(core, 'setFailed').mockReturnValue()

        await main.run()

        expect(getRepositoryMock).toHaveBeenCalled()
        expect(setFailedMock).toHaveBeenCalledWith(
          'Latest commit on branch "workflow-branch" not found'
        )
      })
    })
  })

  it('commit files and output commit sha', async () => {
    vi.spyOn(core, 'getInput').mockImplementation((name, _option) => {
      if (name == 'branch-name') return 'custom-branch'
      return ''
    })
    vi.spyOn(core, 'getMultilineInput').mockReturnValue(['/test.txt'])
    vi.spyOn(git, 'addFileChanges').mockResolvedValue()
    vi.spyOn(git, 'getFileChanges').mockResolvedValue({
      additions: [{ path: '/test.txt', contents: '' }],
    })

    const switchBranchMock = vi.spyOn(git, 'switchBranch').mockResolvedValue()
    const getRepositoryMock = vi
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
    const pushBranchMock = vi
      .spyOn(git, 'pushCurrentBranch')
      .mockResolvedValue()
    const createCommitMock = vi
      .spyOn(graphql, 'createCommitOnBranch')
      .mockResolvedValue({
        commit: { oid: 'my-commit-sha' },
      } as CreateCommitOnBranchPayload)
    const setOutputMock = vi.spyOn(core, 'setOutput').mockReturnValue()

    await main.run()

    expect(switchBranchMock).toHaveBeenCalled()
    expect(getRepositoryMock).toHaveBeenCalled()
    expect(pushBranchMock).toHaveBeenCalled()
    expect(createCommitMock).toHaveBeenCalled()
    expect(setOutputMock).toHaveBeenCalledWith('commit-sha', 'my-commit-sha')
  })

  it('push tag only', async () => {
    vi.spyOn(core, 'getInput').mockImplementation((name, _option) => {
      if (name == 'branch-name') return 'tag-branch'
      if (name == 'tag') return 'fake-tag'
      return ''
    })
    vi.spyOn(core, 'getMultilineInput').mockReturnValue([])

    const switchBranchMock = vi.spyOn(git, 'switchBranch').mockResolvedValue()
    const getRepositoryMock = vi
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
    const pushBranchMock = vi
      .spyOn(git, 'pushCurrentBranch')
      .mockResolvedValue()
    const createTagMock = vi
      .spyOn(graphql, 'createTagOnCommit')
      .mockResolvedValue({
        ref: { name: 'fake-tag' },
      } as CreateRefPayload)
    const setFailedMock = vi.spyOn(core, 'setFailed').mockReturnValue()

    await main.run()

    expect(switchBranchMock).toHaveBeenCalled()
    expect(getRepositoryMock).toHaveBeenCalled()
    expect(pushBranchMock).toHaveBeenCalled()
    expect(createTagMock).toHaveBeenCalled()
    expect(setFailedMock).not.toHaveBeenCalled()
  })

  it('commit file and push tag', async () => {
    vi.spyOn(core, 'getInput').mockImplementation((name, _option) => {
      if (name == 'branch-name') return 'file-tag-branch'
      if (name == 'tag') return 'fake-file-tag'
      return ''
    })
    vi.spyOn(core, 'getMultilineInput').mockReturnValue(['/test.txt'])
    vi.spyOn(git, 'addFileChanges').mockResolvedValue()
    vi.spyOn(git, 'getFileChanges').mockResolvedValue({
      additions: [{ path: '/test.txt', contents: '' }],
    })

    const switchBranchMock = vi.spyOn(git, 'switchBranch').mockResolvedValue()
    const getRepositoryMock = vi
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
    const pushBranchMock = vi
      .spyOn(git, 'pushCurrentBranch')
      .mockResolvedValue()
    const createCommitMock = vi
      .spyOn(graphql, 'createCommitOnBranch')
      .mockResolvedValue({
        commit: { oid: 'fake-commit-sha' },
      } as CreateCommitOnBranchPayload)
    const createTagMock = vi
      .spyOn(graphql, 'createTagOnCommit')
      .mockResolvedValue({
        ref: { name: 'fake-file-tag' },
      } as CreateRefPayload)
    const setOutputMock = vi.spyOn(core, 'setOutput').mockReturnValue()

    await main.run()

    expect(switchBranchMock).toHaveBeenCalled()
    expect(getRepositoryMock).toHaveBeenCalled()
    expect(pushBranchMock).toHaveBeenCalled()
    expect(createCommitMock).toHaveBeenCalled()
    expect(createTagMock).toHaveBeenCalled()
    expect(setOutputMock).toHaveBeenCalledWith('commit-sha', 'fake-commit-sha')
    expect(setOutputMock).toHaveBeenCalledWith('tag', 'fake-file-tag')
  })

  it('commit file fails woukd skip push tag', async () => {
    vi.spyOn(core, 'getInput').mockImplementation((name, _option) => {
      if (name == 'branch-name') return 'file-fail-tag-branch'
      if (name == 'tag') return 'unreachable-tag'
      return ''
    })
    vi.spyOn(core, 'getMultilineInput').mockReturnValue(['/test.txt'])
    vi.spyOn(git, 'addFileChanges').mockResolvedValue()
    vi.spyOn(git, 'getFileChanges').mockResolvedValue({
      additions: [{ path: '/test.txt', contents: '' }],
    })

    const switchBranchMock = vi.spyOn(git, 'switchBranch').mockResolvedValue()
    const getRepositoryMock = vi
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
    const pushBranchMock = vi
      .spyOn(git, 'pushCurrentBranch')
      .mockResolvedValue()
    const createCommitMock = vi
      .spyOn(graphql, 'createCommitOnBranch')
      .mockRejectedValue(new Error('Fail to commit files'))
    const createTagMock = vi.spyOn(graphql, 'createTagOnCommit')
    const setOutputMock = vi.spyOn(core, 'setOutput').mockReturnValue()
    const setFailedMock = vi.spyOn(core, 'setFailed').mockReturnValue()

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
