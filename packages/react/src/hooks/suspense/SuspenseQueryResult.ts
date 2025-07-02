import { QueryResult, ReadonlyQueryResult } from '../watched/watch-types';

export type SuspenseQueryResult<T> = Pick<QueryResult<T>, 'data' | 'refresh'>;
export type ReadonlySuspenseQueryResult<T> = Pick<ReadonlyQueryResult<T>, 'data' | 'refresh'>;
