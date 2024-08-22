import * as core from '@actions/core'
import * as main from '../src/main'
import { describe, jest, beforeEach, it, expect } from '@jest/globals'

describe('action', () => {
  let runMock: jest.SpiedFunction<typeof main.run>
  let debugMock: jest.SpiedFunction<typeof core.debug>
  let errorMock: jest.SpiedFunction<typeof core.error>
  let setFailedMock: jest.SpiedFunction<typeof core.setFailed>
  let setOutputMock: jest.SpiedFunction<typeof core.setOutput>
  let mockGetMultilineInput: jest.SpiedFunction<typeof core.getMultilineInput>

  beforeEach(() => {
    jest.clearAllMocks()

    runMock = jest.spyOn(main, 'run')
    debugMock = jest.spyOn(core, 'debug').mockReturnThis()
    errorMock = jest.spyOn(core, 'error').mockReturnThis()
    setFailedMock = jest.spyOn(core, 'setFailed').mockReturnThis()
    setOutputMock = jest.spyOn(core, 'setOutput').mockReturnThis()
    mockGetMultilineInput = jest.spyOn(core, 'getMultilineInput')
  })

  it('sets a failed status', async () => {
    mockGetMultilineInput.mockImplementation(() => {
      throw new Error('My Error')
    })

    await expect(main.run()).resolves
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(setFailedMock).toHaveBeenCalledWith('My Error')
    expect(errorMock).not.toHaveBeenCalled()
  })
})
