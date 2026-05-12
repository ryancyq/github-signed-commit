import { describe, vi, afterEach, beforeEach, it, expect } from 'vitest'
import { graphqlClient } from '../../src/github/client'

describe('GitHub Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubEnv('GH_TOKEN', 'fake-token')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should set authorization header from GH_TOKEN', async () => {
    expect(graphqlClient().endpoint.DEFAULTS.headers).toHaveProperty(
      'authorization',
      'bearer fake-token'
    )
  })

  it('should set user-agent', async () => {
    expect(graphqlClient().endpoint.DEFAULTS.headers).toHaveProperty(
      'user-agent',
      `${process.env.npm_package_name}/${process.env.npm_package_version}`
    )
  })
})
