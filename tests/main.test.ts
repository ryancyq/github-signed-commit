import * as core from '@actions/core'
import * as main from '../src/main'
import { describe, jest, beforeEach, it, expect } from '@jest/globals'

const runMock = jest.spyOn(main, 'run')

let debugMock: jest.SpiedFunction<typeof core.debug>
let errorMock: jest.SpiedFunction<typeof core.error>
let setFailedMock: jest.SpiedFunction<typeof core.setFailed>
let setOutputMock: jest.SpiedFunction<typeof core.setOutput>

jest.mock('@actions/core')
const getMultilineInputMock = core.getMultilineInput as jest.MockedFunction<
  typeof core.getMultilineInput
>

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    debugMock = jest.spyOn(core, 'debug')
    errorMock = jest.spyOn(core, 'error')
    setFailedMock = jest.spyOn(core, 'setFailed')
    setOutputMock = jest.spyOn(core, 'setOutput')
  })

  it('sets a failed status', async () => {
    getMultilineInputMock.mockImplementation(() => {
      throw new Error('My Error')
    })

    await expect(main.run()).resolves
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(setFailedMock).toHaveBeenCalledWith('My Error')
    expect(errorMock).not.toHaveBeenCalled()
  })
})
