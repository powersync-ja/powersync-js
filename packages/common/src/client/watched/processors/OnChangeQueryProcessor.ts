import { WatchedQueryState } from '../WatchedQuery.js';
import {
  AbstractQueryProcessor,
  AbstractQueryProcessorOptions,
  LinkQueryStreamOptions
} from './AbstractQueryProcessor.js';

export interface OnChangeQueryProcessorOptions<T> extends AbstractQueryProcessorOptions<T> {
  compareBy?: (element: T) => string;
}

/**
 * Uses the PowerSync onChange event to trigger watched queries.
 * Results are emitted on every change of the relevant tables.
 */
export class OnChangeQueryProcessor<T> extends AbstractQueryProcessor<T> {
  constructor(protected options: OnChangeQueryProcessorOptions<T>) {
    super(options);
  }

  /*
   * @returns If the sets are equal
   */
  protected checkEquality(current: T[], previous: T[]): boolean {
    if (current.length == 0 && previous.length == 0) {
      return true;
    }

    if (current.length !== previous.length) {
      return false;
    }

    const { compareBy } = this.options;
    // Assume items are not equal if we can't compare them
    if (!compareBy) {
      return false;
    }

    // At this point the lengths are equal
    for (let i = 0; i < current.length; i++) {
      const currentItem = compareBy(current[i]);
      const previousItem = compareBy(previous[i]);

      if (currentItem !== previousItem) {
        return false;
      }
    }

    return true;
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
              this.updateState({ isFetching: true });
            }

            const partialStateUpdate: Partial<WatchedQueryState<T>> = {};

            // Always run the query if an underlaying table has changed
            const result = watchedQuery.queryExecutor
              ? await watchedQuery.queryExecutor()
              : await db.getAll<T>(watchedQuery.query, watchedQuery.parameters);

            if (this.reportFetching) {
              partialStateUpdate.isFetching = false;
            }

            if (this.state.isLoading) {
              partialStateUpdate.isLoading = false;
            }

            // Check if the result has changed
            if (!this.checkEquality(result, this.state.data)) {
              partialStateUpdate.data = result;
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
