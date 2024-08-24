import * as core from '@actions/core'
import { getInput } from './input'

export function getCwd() {
  const current = process.cwd()
  core.debug(`cwd: ${current}`)
  return current
}

export function getWorkspace() {
  const workspace = getInput('workspace', {
    default: process.env.GITHUB_WORKSPACE,
  })
  core.debug(`workspace: ${workspace}`)
  return workspace
}
