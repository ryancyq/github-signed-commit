import * as core from '@actions/core'
import { exec } from '@actions/exec'
import { join } from 'node:path'
import {
  FileChanges,
  FileAddition,
  FileDeletion,
} from '@octokit/graphql-schema'

import { getCwd } from './utils/cwd'

export async function switchBranch(branch: string) {
  await exec('git', ['checkout', '-b', branch], {
    listeners: {
      errline: (error: string) => {
        core.error(error)
      },
    },
  })
}

export async function pushCurrentBranch() {
  const pushArgs = ['push', '--porcelain', '--set-upstream', 'origin', 'HEAD']
  if (core.getBooleanInput('branch-push-force')) {
    pushArgs.splice(1, 0, '--force')
  }

  await exec('git', pushArgs, {
    listeners: {
      errline: (error: string) => {
        core.error(error)
      },
    },
  })
}

export async function addFileChanges(globPatterns: string[]): Promise<void> {
  const cwd = getCwd()
  const cwdPaths = globPatterns.map((p) => join(cwd, p))

  await exec('git', ['add', '--', ...cwdPaths], {
    ignoreReturnCode: true,
    listeners: {
      errline: (error: string) => {
        core.warning(error)
      },
    },
  })
}

export async function getFileChanges(): Promise<FileChanges> {
  const output: string[] = []
  await exec('git', ['status', '-suall', '--porcelain'], {
    listeners: {
      stdline: (data: string) => {
        output.push(data)
      },
      errline: (error: string) => {
        core.error(error)
      },
    },
  })

  const additions: FileAddition[] = []
  const deletions: FileDeletion[] = []
  output.forEach((line) => {
    const staged = line.charAt(0)
    const filePath = line.slice(3)
    switch (staged) {
      case 'D': {
        deletions.push({ path: filePath })
        break
      }
      case '?':
      case 'A':
      case 'M': {
        additions.push({ path: filePath, contents: '' })
        break
      }
      case 'R': {
        const [from, to] = filePath.split('->')
        deletions.push({ path: from.trim() })
        additions.push({ path: to.trim(), contents: '' })
        break
      }
    }
  })

  const filesChanges: FileChanges = {}
  if (additions.length > 0) {
    filesChanges.additions = additions
  }
  if (deletions.length > 0) {
    filesChanges.deletions = deletions
  }
  return filesChanges
}
