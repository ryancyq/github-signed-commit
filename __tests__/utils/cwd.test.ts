import * as core from '@actions/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getCwd, getWorkspace } from '../../src/utils/cwd'

describe('Current Working Directory', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(core, 'debug').mockReturnValue()
  })

  describe('getCwd', () => {
    it('should read from process.cwd', async () => {
      vi.spyOn(process, 'cwd').mockReturnValue('/my-process-cwd')

      expect(getCwd()).toBe('/my-process-cwd')
    })
  })
})

describe('Current Workspace', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(core, 'debug').mockReturnValue()
  })

  describe('getWorkspace', () => {
    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('should read from GITHUB_WORKSPACE by default', async () => {
      vi.stubEnv('GITHUB_WORKSPACE', '/users/test')

      expect(getWorkspace()).toBe('/users/test')
    })

    it('should read from workspace input if any', async () => {
      const getInputMock = vi
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
