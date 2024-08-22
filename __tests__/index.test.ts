import * as core from '@actions/core'
import * as main from '../src/main'
import { describe, jest, beforeEach, it, expect } from '@jest/globals'

describe('index', () => {
  let runMock: jest.SpiedFunction<typeof main.run>

  it('calls run when imported', async () => {
    runMock = jest.spyOn(main, 'run')

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../src/index')

    expect(runMock).toHaveBeenCalled()
  })
})
