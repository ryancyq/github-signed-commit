import { Buffer } from 'node:buffer'
import { Readable } from 'node:stream'
import { describe, it, expect } from 'vitest'
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

  it('binary stream without corruption', async () => {
    const binary = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0xfe, 0x00, 0x01,
    ])
    const stream = Readable.from(binary).pipe(new Base64Encoder())

    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    const streamedContent = Buffer.concat(chunks).toString('utf8')
    expect(streamedContent).toEqual(binary.toString('base64'))
  })
})
