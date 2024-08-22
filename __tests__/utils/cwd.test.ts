import * as core from '@actions/core'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals'
import { getCwd } from '../../src/utils/cwd'

describe('Current Working Directory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getCwd', () => {
    let mockGetInput: jest.SpiedFunction<typeof core.getInput>
    let replacedEnv: jest.Replaced<typeof process.env> | undefined

    beforeEach(() => {
      jest.resetModules()
      mockGetInput = jest.spyOn(core, 'getInput')
    })

    afterEach(() => {
      replacedEnv?.restore()
    })

    it('should read from GITHUB_WORKSPACE by default', async () => {
      replacedEnv = jest.replaceProperty(process, 'env', {
        GITHUB_WORKSPACE: '/users/test',
      })

      expect(getCwd()).toBe('/users/test')
      expect(mockGetInput).toBeCalled()
    })

    it('should read from workspace input if any', async () => {
      mockGetInput.mockImplementation((name, options) => {
        if (name === 'workspace') return '/users/my-workspace'
        return ''
      })

      expect(getCwd()).toBe('/users/my-workspace')
      expect(mockGetInput).toBeCalled()
    })
  })
})
