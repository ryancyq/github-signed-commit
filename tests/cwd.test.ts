import { describe, jest, beforeEach, afterAll, it, expect } from '@jest/globals'

import * as core from '@actions/core'
import { getCwd } from '../src/cwd'

jest.mock('@actions/core')

const mockGetInput = core.getInput as jest.MockedFunction<typeof core.getInput>

describe('Current Working Directory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getCwd', () => {
    const OLD_ENV = process.env
    beforeEach(() => {
      jest.resetModules()
      process.env.GITHUB_WORKSPACE = '/users/test'
    })

    afterAll(() => {
      process.env = OLD_ENV
    })

    it('should read from GITHUB_WORKSPACE by default', async () => {
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
