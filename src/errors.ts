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

export class InputBranchNotFound extends Error {
  constructor(branchName: string) {
    super(`Input <branch-name> "${branchName}" not found`)
  }
}
