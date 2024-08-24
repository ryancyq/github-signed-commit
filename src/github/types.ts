import {
  Commit,
  CommitHistoryConnection,
  Maybe,
  Ref,
  Repository,
} from '@octokit/graphql-schema'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isCommit(obj: any): obj is Commit {
  return !!obj && 'oid' in obj && 'message' in obj && 'committedDate' in obj
}

export type RefWithCommitHistory = Omit<Ref, 'target'> & {
  target: {
    history: Maybe<CommitHistoryConnection>
  }
}

export type RepositoryWithCommitHistory = Omit<
  Repository,
  'defaultBranchRef' | 'ref'
> & {
  ref: Maybe<RefWithCommitHistory>
  defaultBranchRef: Maybe<RefWithCommitHistory>
}
