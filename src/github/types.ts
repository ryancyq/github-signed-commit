import {
  CommitHistoryConnection,
  Maybe,
  Ref,
  Repository,
} from '@octokit/graphql-schema'

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
