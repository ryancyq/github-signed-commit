import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { describe, jest, beforeEach, afterAll, it, expect } from '@jest/globals'
import * as cwd from '../src/utils/cwd'
import {
  addFileChanges,
  getFileChanges,
  switchBranch,
  pushCurrentBranch,
} from '../src/git'

describe('Git CLI', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(cwd, 'getCwd').mockReturnValue('/users/test-workspace')
  })

  describe('git checkout', () => {
    it('should create new branch', async () => {
      const execMock = jest.spyOn(exec, 'exec').mockResolvedValue(0)

      await switchBranch('new-branch')
      expect(execMock).toHaveBeenCalled()
      expect(execMock).toHaveBeenCalledWith(
        'git',
        ['checkout', '-b', '--', 'new-branch'],
        expect.objectContaining({ listeners: { errline: expect.anything() } })
      )
    })

    it('should log error', async () => {
      const execMock = jest
        .spyOn(exec, 'exec')
        .mockImplementation(async (cmd, args, options) => {
          const io = options?.listeners?.errline
          if (io) {
            io.call(this, "fatal: 'new-branch' is invalid")
            return 1
          }
          return 0
        })

      const errorMock = jest.spyOn(core, 'error').mockReturnValue()

      await switchBranch('new-branch')
      expect(execMock).toHaveBeenCalled()
      expect(errorMock).toHaveBeenCalledWith("fatal: 'new-branch' is invalid")
    })
  })

  describe('git push', () => {
    it('should push new branch', async () => {
      const execMock = jest.spyOn(exec, 'exec').mockResolvedValue(0)
      const getInput = jest
        .spyOn(core, 'getBooleanInput')
        .mockReturnValue(false)

      await pushCurrentBranch()
      expect(execMock).toHaveBeenCalled()
      expect(execMock).toHaveBeenCalledWith(
        'git',
        ['push', '--porcelain', '--set-upstream', 'origin', 'HEAD'],
        expect.objectContaining({ listeners: { errline: expect.anything() } })
      )
    })

    it('should force push new branch', async () => {
      const execMock = jest.spyOn(exec, 'exec').mockResolvedValue(0)
      const getInput = jest.spyOn(core, 'getBooleanInput').mockReturnValue(true)

      await pushCurrentBranch()
      expect(execMock).toHaveBeenCalled()
      expect(execMock).toHaveBeenCalledWith(
        'git',
        ['push', '--force', '--porcelain', '--set-upstream', 'origin', 'HEAD'],
        expect.objectContaining({ listeners: { errline: expect.anything() } })
      )
      expect(getInput).toHaveBeenCalledWith('branch-push-force')
    })

    it('should log error', async () => {
      const execMock = jest
        .spyOn(exec, 'exec')
        .mockImplementation(async (cmd, args, options) => {
          const io = options?.listeners?.errline
          if (io) {
            io.call(this, "fatal: 'new-branch' is rejected")
            return 1
          }
          return 0
        })

      const errorMock = jest.spyOn(core, 'error').mockReturnValue()

      await pushCurrentBranch()
      expect(execMock).toHaveBeenCalled()
      expect(errorMock).toHaveBeenCalledWith("fatal: 'new-branch' is rejected")
    })
  })

  describe('git add', () => {
    it('should ensure file paths are within curent working directory', async () => {
      const execMock = jest.spyOn(exec, 'exec').mockResolvedValue(0)

      await addFileChanges(['*.ts', '~/.bashrc'])
      expect(execMock).toHaveBeenCalled()
      expect(execMock).toHaveBeenCalledWith(
        'git',
        [
          'add',
          '--',
          '/users/test-workspace/*.ts',
          '/users/test-workspace/~/.bashrc',
        ],
        expect.objectContaining({ listeners: { errline: expect.anything() } })
      )
    })

    it('should log error', async () => {
      const execMock = jest
        .spyOn(exec, 'exec')
        .mockImplementation(async (cmd, args, options) => {
          const io = options?.listeners?.errline
          if (io) {
            io.call(this, "fatal: pathspec 'main.ts' did not match any files")
            return 1
          }
          return 0
        })

      const warningMock = jest.spyOn(core, 'warning').mockReturnValue()
      await addFileChanges(['*.ts'])
      expect(execMock).toHaveBeenCalled()
      expect(warningMock).toHaveBeenCalledWith(
        "fatal: pathspec 'main.ts' did not match any files"
      )
    })
  })

  describe('git status', () => {
    const gitStatus = [
      ' D src/index.ts',
      'DA src/indices.ts',
      'AM src/main.ts',
      'A  src/run.ts',
      '?? src/errors.ts',
      'RM tests/main.test.ts -> tests/program.test.ts',
      'D  tests/runner.test.ts',
      'A  tests/run.test.ts',
    ]

    beforeEach(() => {})

    it('should parse ouput into file changes', async () => {
      const execMock = jest
        .spyOn(exec, 'exec')
        .mockImplementation(async (cmd, args, options) => {
          const io = options?.listeners?.stdline
          if (io) {
            gitStatus.forEach((o) => io.call(this, o))
          }
          return 0
        })

      const changes = await getFileChanges()
      expect(execMock).toHaveBeenCalled()
      expect(changes).toBeDefined()
      expect(changes.additions).toBeDefined()
      expect(changes.additions).toHaveLength(5)
      expect(changes.additions).toContainEqual(
        expect.objectContaining({ path: 'src/main.ts' })
      )
      expect(changes.additions).toContainEqual(
        expect.objectContaining({ path: 'src/run.ts' })
      )
      expect(changes.additions).toContainEqual(
        expect.objectContaining({ path: 'src/errors.ts' })
      )
      expect(changes.additions).toContainEqual(
        expect.objectContaining({ path: 'tests/program.test.ts' })
      )
      expect(changes.additions).toContainEqual(
        expect.objectContaining({ path: 'tests/run.test.ts' })
      )
      expect(changes.deletions).toBeDefined()
      expect(changes.deletions).toHaveLength(3)
      expect(changes.deletions).toContainEqual(
        expect.objectContaining({ path: 'src/indices.ts' })
      )
      expect(changes.deletions).toContainEqual(
        expect.objectContaining({ path: 'tests/main.test.ts' })
      )
      expect(changes.deletions).toContainEqual(
        expect.objectContaining({ path: 'tests/runner.test.ts' })
      )
    })
  })
})
