import { describe, jest, beforeEach, it, expect } from '@jest/globals'

import * as core from '@actions/core'
import * as main from '../src/main'

jest.mock('@actions/core')

const runMock = jest
  .spyOn(main, 'run')
  .mockImplementation(() => Promise.resolve())

describe('index', () => {
  it('calls run when imported', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../src/index')

    expect(runMock).toHaveBeenCalled()
  })
})
