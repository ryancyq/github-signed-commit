import * as core from '@actions/core'

export interface InputOptions extends core.InputOptions {
  default?: string
}

export function getInput(name: string, options: InputOptions = {}): string {
  const value = core.getInput(name, options)

  if (!value && options.default) {
    core.debug(`${name}: ${options.default}`)
    return options.default
  }

  core.debug(`${name}: ${value}`)
  return value
}
