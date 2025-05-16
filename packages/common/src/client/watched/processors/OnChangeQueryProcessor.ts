import { WatchedQueryResult } from '../WatchedQueryResult.js';
import { AbstractQueryProcessor, LinkQueryStreamOptions } from './AbstractQueryProcessor.js';

/**
 * Uses the PowerSync onChange event to trigger watched queries.
 * Results are emitted on every change of the relevant tables.
 */
export class OnChangeQueryProcessor<T> extends AbstractQueryProcessor<T> {
  /**
   * Always returns the result set on every onChange event. Deltas are not supported by this processor.
   */
  protected processResultSet(result: T[]): WatchedQueryResult<T> | null {
    return {
      all: result,
      delta: () => {
        throw new Error('Delta not implemented for OnChangeQueryProcessor');
      }
    };
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
            if (this.reportFetching) {
              this.state.fetching = true;
              stream.enqueueData(this.state);
            }

            let dirty = false;

            // Always run the query if an underlaying table has changed
            const result = watchedQuery.queryExecutor
              ? await watchedQuery.queryExecutor()
              : await db.getAll<T>(watchedQuery.query, watchedQuery.parameters);

            if (this.reportFetching) {
              this.state.fetching = false;
              dirty = true;
            }

            if (this.state.loading) {
              this.state.loading = false;
              dirty = true;
            }

            // Check if the result has changed
            const watchedQueryResult = this.processResultSet(result);
            if (watchedQueryResult) {
              this.state.data = watchedQueryResult;
              this.state.lastUpdated = new Date();
              dirty = true;
            }

            if (dirty) {
              stream.enqueueData(this.state);
            }
          } catch (error) {
            this.state.error = error;
            stream.enqueueData(this.state);
            // TODO?
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
        triggerImmediate: true // used to emit the initial state
      }
    );
  }
}
