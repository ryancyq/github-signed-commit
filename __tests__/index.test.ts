import * as main from '../src/main'
import { vi, describe, it, expect } from 'vitest'

vi.mock('../src/main', () => ({
  run: vi.fn(),
}))

describe('index', () => {
  it('calls run when imported', async () => {
    await import('../src/index')
    expect(main.run).toHaveBeenCalled()
  })
})
