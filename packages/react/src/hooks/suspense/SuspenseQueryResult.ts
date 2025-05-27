import { QueryResult } from '../watched/watch-types';

export type SuspenseQueryResult<T> = Pick<QueryResult<T>, 'data' | 'refresh'>;
