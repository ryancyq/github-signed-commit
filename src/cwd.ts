import { getInput } from './input'

export function getCwd() {
  return (
    getInput('workspace', { default: process.env.GITHUB_WORKSPACE }) ??
    process.cwd()
  )
}

const cwd = getCwd()
export default cwd
