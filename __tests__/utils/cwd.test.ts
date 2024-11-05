import * as core from '@actions/core'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals'
import { getCwd, getWorkspace } from '../../src/utils/cwd'

describe('Current Working Directory', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    jest.spyOn(core, 'debug').mockReturnValue()
  })

  describe('getCwd', () => {
    it('should read from process.cwd', async () => {
      jest.spyOn(process, 'cwd').mockReturnValue('/my-process-cwd')

      expect(getCwd()).toBe('/my-process-cwd')
    })
  })
})

describe('Current Workspace', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    jest.spyOn(core, 'debug').mockReturnValue()
  })

  describe('getWorkspace', () => {
    let replacedEnv: jest.Replaced<typeof process.env> | undefined

    afterEach(() => {
      replacedEnv?.restore()
    })

    it('should read from GITHUB_WORKSPACE by default', async () => {
      replacedEnv = jest.replaceProperty(process, 'env', {
        GITHUB_WORKSPACE: '/users/test',
      })

      expect(getWorkspace()).toBe('/users/test')
    })

    it('should read from workspace input if any', async () => {
      const getInputMock = jest
        .spyOn(core, 'getInput')
        .mockImplementation((name, options) => {
          if (name === 'workspace') return '/users/my-workspace'
          return ''
        })

      expect(getWorkspace()).toBe('/users/my-workspace')
      expect(getInputMock).toHaveBeenCalled()
    })
  })
})
