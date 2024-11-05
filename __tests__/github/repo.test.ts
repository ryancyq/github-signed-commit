import * as core from '@actions/core'
import * as github from '@actions/github'
import { describe, jest, beforeEach, it, expect } from '@jest/globals'
import { getContext } from '../../src/github/repo'

describe('getContext', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    jest
      .spyOn(github.context, 'repo', 'get')
      .mockReturnValue({ repo: 'my-repo', owner: 'my-user' })
  })

  it('extract owner and repo', () => {
    jest.replaceProperty(github.context, 'ref', 'refs/heads/main')
    const context = getContext()
    expect(context).toHaveProperty('owner', 'my-user')
    expect(context).toHaveProperty('repo', 'my-repo')
  })

  describe('branch', () => {
    it('resolves head ref', () => {
      jest.replaceProperty(github.context, 'ref', 'refs/heads/default-branch')
      expect(getContext()).toHaveProperty('branch', 'default-branch')
    })

    it('resolves pull request ref', async () => {
      jest.replaceProperty(github.context, 'ref', 'refs/pull/123/merge')
      jest.replaceProperty(github.context, 'payload', {
        pull_request: { number: 123, head: { ref: 'my-branch' } },
      })
      expect(getContext()).toHaveProperty('branch', 'my-branch')
    })
  })
})
