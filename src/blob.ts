import { warning } from '@actions/core'
import { exec } from '@actions/exec'
import * as fs from 'node:fs'
import { Buffer } from 'node:buffer'
import { join } from 'node:path'
import { Readable, Transform } from 'node:stream'
import { FileAddition } from '@octokit/graphql-schema'

import cwd from './cwd'

export function isFileAddition(
  fileAddition: unknown
): fileAddition is FileAddition {
  const file = fileAddition as FileAddition
  return file?.path !== undefined && file?.contents !== undefined
}

export class Blob implements FileAddition {
  path: string
  contents: string
  stream: Readable

  constructor(path: string, stream: Readable) {
    this.path = path
    this.contents = ''
    this.stream = stream
  }

  async load(): Promise<Blob> {
    const chunks: Buffer[] = []
    for await (const chunk of this.stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    this.contents = Buffer.concat(chunks).toString('utf-8')
    return this
  }
}

const base64Transform = new Transform({
  transform(chunk, encoding, callback) {
    const base64Chunk = chunk.toString('base64')
    this.push(base64Chunk)
    callback()
  },
})

const createStream = (file: FileAddition) => {
  const stream = fs
    .createReadStream(join(cwd, file.path), { encoding: 'utf8' })
    .pipe(base64Transform)
  return new Blob(file.path, stream)
}

export function readFileContent(file: FileAddition): Blob
export function readFileContent(file: FileAddition[]): Blob[]
export function readFileContent(file: unknown): unknown {
  if (Array.isArray(file)) {
    return file.map(createStream)
  } else if (isFileAddition(file)) {
    return createStream(file)
  }
}
