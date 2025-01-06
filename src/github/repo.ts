import * as github from '@actions/github'

function resolveCurrentBranch(ref: string): string {
  if (ref.startsWith('refs/heads/')) {
    return ref.replace(/refs\/heads\//g, '')
  } else if (ref.startsWith('refs/pull/')) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return github.context.payload.pull_request?.head?.ref ?? ''
  } else if (ref.startsWith('refs/tags/')) {
    return ''
  }

  throw new Error(`Unsupported ref: ${ref}`)
}

export function getContext() {
  const { ref, repo } = github.context
  return {
    owner: repo.owner,
    repo: repo.repo,
    branch: resolveCurrentBranch(ref),
  }
}
