export class NoChangesError extends Error {
  constructor() {
    super('No changes')
  }
}

export class FileMissingError extends Error {
  constructor() {
    super('No files')
  }
}
