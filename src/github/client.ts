import { getInput } from '@actions/core'
import { graphql } from '@octokit/graphql'
import { RequestHeaders } from '@octokit/types'

export function graphqlClient() {
  const token = process.env.GH_TOKEN
  if (!token) {
    throw new Error('The ENV variable "GH_TOKEN" is required.')
  }

  const customHeaders: RequestHeaders = {}
  customHeaders.authorization = `bearer ${token}`

  if (process.env.npm_package_name && process.env.npm_package_version) {
    customHeaders['user-agent'] = [
      process.env.npm_package_name,
      process.env.npm_package_version,
    ].join('/')
  }

  return graphql.defaults({ headers: customHeaders })
}
