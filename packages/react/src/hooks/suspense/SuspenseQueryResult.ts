import { QueryResult } from '../useQuery';

export type SuspenseQueryResult<T> = Pick<QueryResult<T>, 'data' | 'refresh'>;
