import * as core from '@actions/core'
import { getInput } from './input'

export function getCwd() {
  const workspace = getInput('workspace', {
    default: process.env.GITHUB_WORKSPACE,
  })
  if (workspace) {
    core.debug(`cwd: ${workspace}`)
    return workspace
  }
  const current = process.cwd()
  core.debug(`cwd: ${current}`)
  return current
}
