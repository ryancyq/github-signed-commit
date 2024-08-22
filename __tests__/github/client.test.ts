import * as core from '@actions/core'
import { describe, jest, beforeEach, it, expect } from '@jest/globals'
import { graphqlClient } from '../../src/github/client'

describe('GitHub Client', () => {
  let mockGetInput: jest.SpiedFunction<typeof core.getInput>

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetInput = jest
      .spyOn(core, 'getInput')
      .mockImplementation((name, options) => {
        return name === 'GH_TOKEN' ? 'fake-token' : ''
      })
  })

  it('should read GH_TOKEN from input', async () => {
    expect(graphqlClient()).toBeDefined()
    expect(mockGetInput).toHaveBeenCalledWith('GH_TOKEN', { required: true })
  })

  it('should build new graphql client', async () => {
    expect(graphqlClient).toBeInstanceOf(Function)
  })

  it('should set user-agent', async () => {
    expect(graphqlClient().endpoint.DEFAULTS.headers).toHaveProperty(
      'user-agent',
      '@ryancyq/signed-commit/3.0.0'
    )
  })
})
