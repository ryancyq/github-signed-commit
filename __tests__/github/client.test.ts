import {
  describe,
  jest,
  afterEach,
  beforeEach,
  it,
  expect,
} from '@jest/globals'
import { graphqlClient } from '../../src/github/client'

describe('GitHub Client', () => {
  let replacedEnv: jest.Replaced<typeof process.env> | undefined

  beforeEach(() => {
    jest.restoreAllMocks()
    replacedEnv = jest.replaceProperty(
      process,
      'env',
      Object.assign(process.env, { GH_TOKEN: 'fake-token' })
    )
  })

  afterEach(() => {
    replacedEnv?.restore()
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
