import { WatchedQueryState } from '../WatchedQuery.js';
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
          // This fires for each change of the relevant tables
          try {
            if (this.reportFetching) {
              this.updateState({ fetching: true });
            }

            const partialStateUpdate: Partial<WatchedQueryState<T>> = {};

            // Always run the query if an underlaying table has changed
            const result = watchedQuery.queryExecutor
              ? await watchedQuery.queryExecutor()
              : await db.getAll<T>(watchedQuery.query, watchedQuery.parameters);

            if (this.reportFetching) {
              partialStateUpdate.fetching = false;
            }

            if (this.state.loading) {
              partialStateUpdate.loading = false;
            }

            // Check if the result has changed
            const watchedQueryResult = this.processResultSet(result);
            if (watchedQueryResult) {
              partialStateUpdate.data = watchedQueryResult;
              partialStateUpdate.lastUpdated = new Date();
            }

            if (Object.keys(partialStateUpdate).length > 0) {
              this.updateState(partialStateUpdate);
            }
          } catch (error) {
            this.updateState({ error });
          }
        },
        onError: (error) => {
          this.updateState({ error });
          stream.close().catch(() => {});
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
