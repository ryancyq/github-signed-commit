import * as core from '@actions/core'
import fs from 'node:fs'
import { join } from 'node:path'
import { Buffer } from 'node:buffer'
import { Readable, PassThrough } from 'node:stream'
import { describe, jest, beforeEach, it, expect } from '@jest/globals'
import { Blob, getBlob } from '../src/blob'
import * as cwd from '../src/utils/cwd'

describe('Blob', () => {
  beforeEach(() => {
    jest.spyOn(core, 'debug').mockReturnValue()
    jest.spyOn(cwd, 'getCwd').mockReturnValue(__dirname)
  })

  it('path', () => {
    const blob = new Blob('/my_path.txt')
    expect(blob.path).toBe('/my_path.txt')
    expect(blob.absolutePath).toBe(join(__dirname, '/my_path.txt'))
  })

  it('path with current directory', () => {
    const blob = new Blob(join(__dirname, '/my_path.txt'))
    expect(blob.path).toBe('/my_path.txt')
    expect(blob.absolutePath).toBe(join(__dirname, '/my_path.txt'))
  })

  it('getBlob', async () => {
    const blob = getBlob('fixtures/blob.json')

    expect(blob.path).toBe('fixtures/blob.json')
    expect(blob.absolutePath).toBe(join(__dirname, 'fixtures/blob.json'))
  })

  it('getBlob collection', async () => {
    const blobs = getBlob(['fixtures/blob.json'])
    expect(blobs.length).toBe(1)
    const blob = blobs[0]
    expect(blob.path).toBe('fixtures/blob.json')
    expect(blob.absolutePath).toBe(join(__dirname, 'fixtures/blob.json'))
  })

  describe('stream', () => {
    it('file does not exist', async () => {
      const blob = new Blob('/my_stream.txt')
      expect(() => blob.streamable).toThrow(
        /^File does not exist, path: .+\/my_stream\.txt$/
      )
    })

    it('file exists', async () => {
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
  })

  describe('load', () => {
    it('successfully', async () => {
      const blob = getBlob('fixtures/blob.txt')
      const fileAddition = await blob.load()
      expect(fileAddition.contents).toEqual(
        fs.readFileSync(join(__dirname, 'fixtures/blob.base64.txt')).toString()
      )
    })

    it('file with string', async () => {
      const blob = getBlob('fixtures/error.txt')
      const mockStream = new PassThrough()
      jest.spyOn(blob, 'streamable', 'get').mockReturnValue(mockStream)

      const loadPromise = blob.load()
      mockStream.emit('data', 'string data')
      mockStream.end()
      await expect(loadPromise).resolves.toEqual({
        contents: 'string data',
        path: 'fixtures/error.txt',
      })
    })

    it('binary file successfully', async () => {
      const binaryContent = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0xfe, 0x00, 0x80,
        0xc0, 0xc1, 0xf5, 0xf6,
      ])
      const binaryPath = join(__dirname, 'fixtures', 'blob.bin')
      fs.writeFileSync(binaryPath, binaryContent)

      try {
        const blob = getBlob('fixtures/blob.bin')
        const fileAddition = await blob.load()
        expect(fileAddition.contents).toEqual(binaryContent.toString('base64'))
      } finally {
        fs.unlinkSync(binaryPath)
      }
    })

    it('stream with error', async () => {
      const blob = getBlob('fixtures/error.txt')
      const mockStream = new PassThrough()
      jest.spyOn(blob, 'streamable', 'get').mockReturnValue(mockStream)

      blob.load()
      expect(() => mockStream.emit('error', new Error('stream error'))).toThrow(
        /^Read file failed, error: stream error, path: .+\/fixtures\/error\.txt$/
      )
    })
  })
})
