import * as core from '@actions/core'
import * as fs from 'node:fs'
import { Buffer } from 'node:buffer'
import { join } from 'node:path'
import { Readable, Transform } from 'node:stream'
import { finished } from 'node:stream/promises'
import { FileAddition } from '@octokit/graphql-schema'

import { getCwd } from './cwd'

const base64Transform = new Transform({
  transform(chunk, encoding, callback) {
    let transformed = ''

    if (Buffer.isBuffer(chunk)) {
      transformed = chunk.toString('base64')
    }

    callback(null, transformed)
  },
})

export class Blob {
  path: string
  absolutePath: string

  constructor(path: string) {
    this.path = path
    this.absolutePath = join(getCwd(), path)
  }

  get streamable(): Readable {
    if (!fs.existsSync(this.absolutePath)) {
      throw new Error(`File does not exist, path: ${this.absolutePath}.`)
    }

    return fs
      .createReadStream(this.absolutePath, { encoding: 'utf8' })
      .pipe(base64Transform)
  }

  async load(): Promise<FileAddition> {
    const chunks: Buffer[] = []
    const stream = this.streamable

    stream.on('data', (chunk) => {
      if (Buffer.isBuffer(chunk)) chunks.push(chunk)
      else if (typeof chunk === 'string') chunks.push(Buffer.from(chunk))

      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      core.debug(`received blob: ${chunk}`)
    })

    stream.on('error', (err) => {
      throw new Error(
        `Read file failed, error: ${err.message}, path: ${this.absolutePath}`
      )
    })

    await finished(stream)

    const content = Buffer.concat(chunks).toString('utf-8')
    return { path: this.path, contents: content }
  }
}

const createStream = (filePath: string) => new Blob(filePath)

export function getBlob(filePath: string): Blob
export function getBlob(filePath: string[]): Blob[]
export function getBlob(filePath: unknown): unknown {
  if (Array.isArray(filePath)) {
    return filePath.map(createStream)
  } else if (typeof filePath === 'string') {
    return createStream(filePath)
  }
}
