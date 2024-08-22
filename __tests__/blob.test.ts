import fs from 'node:fs'
import { join } from 'node:path'
import { Buffer } from 'node:buffer'
import { Readable } from 'node:stream'
import { describe, jest, beforeEach, it, expect } from '@jest/globals'
import { Blob, getBlob } from '../src/blob'
import * as cwd from '../src/cwd'

describe('Blob', () => {
  let mockCwd: jest.SpiedFunction<typeof cwd.getCwd>
  let blob: Blob

  beforeEach(() => {
    mockCwd = jest.spyOn(cwd, 'getCwd').mockImplementation(() => __dirname)
    blob = new Blob('/my_path.txt')
  })

  it('path', () => {
    expect(blob.path).toBe('/my_path.txt')
    expect(blob.absolutePath).toBe(join(__dirname, '/my_path.txt'))
  })

  it('stream', async () => {
    blob = new Blob('/my_stream.txt')
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
    blob = getBlob('fixtures/blob.json')

    expect(blob.path).toBe('fixtures/blob.json')
    expect(blob.absolutePath).toBe(join(__dirname, 'fixtures/blob.json'))
  })

  it('load', async () => {
    blob = getBlob('fixtures/blob.txt')
    const fileAddition = await blob.load()
    expect(fileAddition.contents).toEqual(
      fs.readFileSync(join(__dirname, 'fixtures/blob.base64.txt')).toString()
    )
  })
})
