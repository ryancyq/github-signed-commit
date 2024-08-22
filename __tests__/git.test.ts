import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { describe, jest, beforeEach, afterAll, it, expect } from '@jest/globals'
import * as cwd from '../src/utils/cwd'
import { addFileChanges, getFileChanges } from '../src/git'

describe('Git CLI', () => {
  let mockExec: jest.SpiedFunction<typeof exec.exec>
  let mockCwd: jest.SpiedFunction<typeof cwd.getCwd>

  beforeEach(() => {
    jest.clearAllMocks()
    mockExec = jest.spyOn(exec, 'exec')
    mockCwd = jest
      .spyOn(cwd, 'getCwd')
      .mockImplementation(() => '/users/test-workspace')
  })

  describe('git add', () => {
    it('should ensure file paths are within curent working directory', async () => {
      mockExec.mockImplementation(async (cmd, args, options) => 0)

      const changes = await addFileChanges(['*.ts', '~/.bashrc'])
      expect(mockExec).toBeCalled()
      expect(mockExec).toBeCalledWith(
        'git',
        [
          'add',
          '/users/test-workspace/*.ts',
          '/users/test-workspace/~/.bashrc',
        ],
        expect.objectContaining({ listeners: { errline: expect.anything() } })
      )
    })

    it('should log error', async () => {
      mockExec.mockImplementation(async (cmd, args, options) => {
        const io = options?.listeners?.errline
        if (io) {
          io.call(this, "fatal: pathspec 'main.ts' did not match any files")
          return 1
        }
        return 0
      })

      const warningMock = jest.spyOn(core, 'warning').mockReturnThis()
      const changes = await addFileChanges(['*.ts'])
      expect(mockExec).toBeCalled()
      expect(warningMock).toBeCalledWith(
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

    beforeEach(() => {
      mockExec.mockImplementation(async (cmd, args, options) => {
        const io = options?.listeners?.stdline
        if (io) {
          gitStatus.forEach((o) => io.call(this, o))
        }
        return 0
      })
    })

    it('should parse ouput into file changes', async () => {
      const changes = await getFileChanges()
      expect(mockExec).toBeCalled()
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
