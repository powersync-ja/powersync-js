import { WatchedQueryOptions, WatchedQueryState } from '../../WatchedQuery.js';
import {
  AbstractQueryProcessor,
  AbstractQueryProcessorOptions,
  LinkQueryStreamOptions
} from '../AbstractQueryProcessor.js';
import { WatchResultComparator } from './WatchComparator.js';

export interface ComparisonQueryProcessorOptions<T> extends AbstractQueryProcessorOptions<T> {
  comparator: WatchResultComparator<T>;
  watchedQuery: WatchedQueryOptions<T>;
}

export class ComparisonQueryProcessor<T> extends AbstractQueryProcessor<T> {
  readonly state: WatchedQueryState<T> = {
    loading: true,
    fetching: true,
    error: null,
    lastUpdated: null,
    data: {
      all: [],
      delta: () => ({ added: [], removed: [], unchanged: [], updated: [] })
    }
  };

  constructor(protected options: ComparisonQueryProcessorOptions<T>) {
    super(options);
  }

  protected async linkStream(options: LinkQueryStreamOptions<T>): Promise<void> {
    const { db, watchedQuery } = this.options;
    const { stream, abortSignal } = options;

    const tables = await db.resolveTables(watchedQuery.query, watchedQuery.parameters);

    db.onChangeWithCallback(
      {
        onChange: async () => {
          console.log('onChange trigger for', this);
          // This fires for each change of the relevant tables
          try {
            this.state.fetching = true;
            stream.enqueueData(this.state);

            // Always run the query if an underlaying table has changed
            const result = watchedQuery.queryExecutor
              ? await watchedQuery.queryExecutor()
              : await db.getAll<T>(watchedQuery.query, watchedQuery.parameters);
            this.state.fetching = false;
            this.state.loading = false;

            // Check if the result has changed
            const comparison = this.options.comparator.compare(this.state.data.all, result);
            if (!comparison.isEqual()) {
              this.state.data = {
                all: result,
                delta: () => comparison.delta() // lazy evaluation
              };
              this.state.lastUpdated = new Date();
            }
            // This is here to cancel any fetching state. Need to verify this does not cause excessive re-renders
            stream.enqueueData(this.state);
          } catch (error) {
            this.state.error = error;
            stream.enqueueData(this.state);
            // TODO;
            //stream.iterateListeners((l) => l.error?.(error));
          }
        },
        onError: (error) => {
          stream.close();
          stream.iterateListeners((l) => l.error?.(error));
        }
      },
      {
        signal: abortSignal,
        tables,
        throttleMs: watchedQuery.throttleMs,
        triggerImmediate: true
      }
    );
  }
}
