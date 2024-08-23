import * as core from '@actions/core'
import * as github from '@actions/github'
import { describe, jest, beforeEach, it, expect } from '@jest/globals'
import * as main from '../src/main'
import * as git from '../src/git'
import * as graphql from '../src/github/graphql'
import { RepositoryWithCommitHistory } from '../src/github/types'

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sets a failed status', async () => {
    const runMock = jest.spyOn(main, 'run')
    const getInputMock = jest
      .spyOn(core, 'getMultilineInput')
      .mockImplementation(() => {
        throw new Error('My Error')
      })
    const errorMock = jest.spyOn(core, 'error').mockReturnValue()
    const setFailedMock = jest.spyOn(core, 'setFailed').mockReturnValue()

    await main.run()

    expect(runMock).toHaveReturned()
    expect(setFailedMock).toHaveBeenCalledWith('My Error')
    expect(errorMock).not.toHaveBeenCalled()
  })
})
