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
    jest.spyOn(core, 'debug').mockReturnThis()
  })

  describe('getCwd', () => {
    let replacedEnv: jest.Replaced<typeof process.env> | undefined

    afterEach(() => {
      replacedEnv?.restore()
    })

    it('should read from GITHUB_WORKSPACE by default', async () => {
      replacedEnv = jest.replaceProperty(process, 'env', {
        GITHUB_WORKSPACE: '/users/test',
      })

      expect(getCwd()).toBe('/users/test')
    })

    it('should read from workspace input if any', async () => {
      const getInputMock = jest
        .spyOn(core, 'getInput')
        .mockImplementation((name, options) => {
          if (name === 'workspace') return '/users/my-workspace'
          return ''
        })

      expect(getCwd()).toBe('/users/my-workspace')
      expect(getInputMock).toBeCalled()
    })
  })
})
