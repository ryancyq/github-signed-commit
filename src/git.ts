import { debug } from '@actions/core'
import { exec } from '@actions/exec'
import {
  FileChanges,
  FileAddition,
  FileDeletion,
} from '@octokit/graphql-schema'
import { join } from 'path'

import { getInput } from './input'

export async function addFileChanges(globPatterns: string[]): Promise<void> {
  const cwd = getInput('workspace', { default: process.env.GITHUB_WORKSPACE })
  const cwdPaths = globPatterns.map((p) => join(cwd ?? '/', p))

  await exec('git', ['add', ...cwdPaths], {
    listeners: {
      errline: (error: string) => {
        debug(error)
      },
    },
  })
}

export async function getFileChanges(): Promise<FileChanges> {
  const output: string[] = []
  await exec('git', ['status', '-suall'], {
    listeners: {
      stdline: (data: string) => output.push(data),
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
