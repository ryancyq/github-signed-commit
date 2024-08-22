import { Buffer } from 'node:buffer'
import { Transform, TransformCallback } from 'node:stream'

export default class Base64Encoder extends Transform {
  overflow: Buffer | undefined

  _transform(
    chunk: Buffer,
    encoding: BufferEncoding, // ignored, since it is always buffer
    callback: TransformCallback
  ): void {
    if (this.overflow) {
      chunk = Buffer.concat([this.overflow, chunk])
      this.overflow = undefined
    }

    // base 64 requires 6 bits (2^6)
    // base 256 requires 8 bits (2^8)
    // each uint8 is 8 bits, so to make sure we are working on the same number of bits
    // every 3 uint8 chars can transform into 4 base64 chars
    const overflowSize = chunk.length % 3
    if (overflowSize !== 0) {
      this.overflow = chunk.subarray(chunk.length - overflowSize)
      chunk = chunk.subarray(0, chunk.length - overflowSize)
    }

    const base64String = chunk.toString('base64')
    this.push(Buffer.from(base64String))
    callback()
  }

  _flush(callback: TransformCallback): void {
    if (this.overflow) {
      this.push(Buffer.from(this.overflow.toString('base64')))
    }
    callback()
  }
}
