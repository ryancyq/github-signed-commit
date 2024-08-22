import * as core from '@actions/core'

export interface InputOptions extends core.InputOptions {
  default?: string
}

export function getInput(name: string, options: InputOptions = {}): string {
  const required = options.required ?? false
  const value = core.getInput(name, Object.assign(options, { required: false }))

  if (!value && options.default) {
    core.debug(`input: ${name}=${options.default}`)
    return options.default
  }

  if (!value && required)
    throw new Error(`Input required and not supplied: ${name}`)

  core.debug(`input: ${name}=${value}`)
  return value
}
