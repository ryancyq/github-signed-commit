import { describe, jest, beforeEach, it, expect } from '@jest/globals'
import fs from 'node:fs'
import { join } from 'node:path'

import { Blob, readFileContent } from '../src/blob'

jest.mock('../src/cwd', () => ({ __esModule: true, default: __dirname }))

describe('Blob', () => {
  let blob: Blob

  beforeEach(() => {
    blob = readFileContent({ path: 'fixtures/blob.txt', contents: '' })
  })

  it('path', () => {
    expect(blob.path).toBe('fixtures/blob.txt')
  })

  it('stream', async () => {
    const originalFile = join(__dirname, blob.path)
    const originalContent = fs.readFileSync(originalFile).toString()

    expect(originalContent).toEqual('Hi, this is Blob.')

    const chunks: Buffer[] = []
    for await (const chunk of blob.stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    const streamedContent = Buffer.concat(chunks).toString('utf8')

    expect(streamedContent).toEqual(
      Buffer.from(originalContent).toString('base64')
    )
  })

  it('load', async () => {
    expect((await blob.load()).contents).toEqual(
      fs.readFileSync(join(__dirname, 'fixtures', 'blob.base64.txt')).toString()
    )
  })
})
