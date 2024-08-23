export class NoFileChanges extends Error {
  constructor() {
    super('No files changes')
  }
}

export class InputFilesRequired extends Error {
  constructor() {
    super('Input <files> is required')
  }
}

export class InputRefNotFound extends Error {
  constructor(ref: string) {
    super(`Input <ref> "${ref}" not found`)
  }
}
