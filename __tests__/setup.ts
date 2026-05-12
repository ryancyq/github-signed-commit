import { vi } from 'vitest'

// @actions/* v3+ packages ship as true ESM, whose module namespace objects are non-configurable
// by spec, making vi.spyOn fail with "Cannot redefine property". Spreading the real exports
// into a plain object gives Vitest a configurable target so spyOn works while keeping the
// original implementations for anything not explicitly mocked in a test.
// See: https://vitest.dev/guide/mocking/modules.html#jsdom-happy-dom-node
vi.mock('@actions/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@actions/core')>()
  return { ...actual }
})

vi.mock('@actions/exec', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@actions/exec')>()
  return { ...actual }
})
