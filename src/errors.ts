export class NoFileChanges extends Error {
  constructor() {
    super('No files changes')
  }
}

export class InputRepositoryInvalid extends Error {
  constructor(repository: string) {
    super(`Input <repository> "${repository}" is invalid`)
  }
}

export class InputBranchNotFound extends Error {
  constructor(branchName: string) {
    super(`Input <branch-name> "${branchName}" not found`)
  }
}

export class BranchNotFound extends Error {
  constructor(branchName: string) {
    super(`Branch "${branchName}" not found`)
  }
}

export class BranchCommitNotFound extends Error {
  constructor(branchName: string) {
    super(`Latest commit on branch "${branchName}" not found`)
  }
}
