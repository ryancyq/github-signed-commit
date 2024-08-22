import { Buffer } from 'node:buffer'
import { Readable } from 'node:stream'
import { describe, jest, beforeEach, it, expect } from '@jest/globals'
import Base64Encoder from '../../src/stream/base64-encoder'

describe('Base64 Encoder', () => {
  it('stream', async () => {
    const content = 'Hello World'
    const stream = Readable.from(content).pipe(new Base64Encoder())

    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    const streamedContent = Buffer.concat(chunks).toString('utf8')
    expect(streamedContent).toEqual(Buffer.from(content).toString('base64'))
  })
})
