import * as core from '@actions/core'
import fs from 'node:fs'
import { join } from 'node:path'
import { Buffer } from 'node:buffer'
import { Readable } from 'node:stream'
import { describe, jest, beforeEach, it, expect } from '@jest/globals'
import { Blob, getBlob } from '../src/blob'
import * as cwd from '../src/utils/cwd'

describe('Blob', () => {
  beforeEach(() => {
    jest.spyOn(core, 'debug').mockReturnThis()
    jest.spyOn(cwd, 'getCwd').mockReturnValue(__dirname)
  })

  it('path', () => {
    const blob = new Blob('/my_path.txt')
    expect(blob.path).toBe('/my_path.txt')
    expect(blob.absolutePath).toBe(join(__dirname, '/my_path.txt'))
  })

  it('stream', async () => {
    const blob = new Blob('/my_stream.txt')
    jest
      .spyOn(blob, 'streamable', 'get')
      .mockReturnValue(Readable.from('Hello World'))

    const chunks: Buffer[] = []
    for await (const chunk of blob.streamable) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    const streamedContent = Buffer.concat(chunks).toString('utf8')
    expect(streamedContent).toEqual('Hello World')
  })

  it('getBlob', async () => {
    const blob = getBlob('fixtures/blob.json')

    expect(blob.path).toBe('fixtures/blob.json')
    expect(blob.absolutePath).toBe(join(__dirname, 'fixtures/blob.json'))
  })

  it('load', async () => {
    const blob = getBlob('fixtures/blob.txt')
    const fileAddition = await blob.load()
    expect(fileAddition.contents).toEqual(
      fs.readFileSync(join(__dirname, 'fixtures/blob.base64.txt')).toString()
    )
  })
})
