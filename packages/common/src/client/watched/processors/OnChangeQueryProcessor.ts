import { WatchedQueryState } from '../WatchedQuery.js';
import { AbstractQueryProcessor, AbstractQueryProcessorOptions, LinkQueryOptions } from './AbstractQueryProcessor.js';
import { WatchedQueryComparator } from './comparators.js';

/**
 * @internal
 */
export interface OnChangeQueryProcessorOptions<Data> extends AbstractQueryProcessorOptions<Data> {
  comparator?: WatchedQueryComparator<Data>;
}

/**
 * Uses the PowerSync onChange event to trigger watched queries.
 * Results are emitted on every change of the relevant tables.
 * @internal
 */
export class OnChangeQueryProcessor<Data> extends AbstractQueryProcessor<Data> {
  constructor(protected options: OnChangeQueryProcessorOptions<Data>) {
    super(options);
  }

  /*
   * @returns If the sets are equal
   */
  protected checkEquality(current: Data, previous: Data): boolean {
    // Use the provided comparator if available. Assume values are unique if not available.
    return this.options.comparator?.checkEquality?.(current, previous) ?? false;
  }

  protected async linkQuery(options: LinkQueryOptions<Data>): Promise<void> {
    const { db, watchOptions } = this.options;
    const { abortSignal } = options;

    const compiledQuery = watchOptions.query.compile();
    const tables = await db.resolveTables(compiledQuery.sql, compiledQuery.parameters as any[]);

    db.onChangeWithCallback(
      {
        onChange: async () => {
          if (this.closed) {
            return;
          }
          // This fires for each change of the relevant tables
          try {
            if (this.reportFetching && !this.state.isFetching) {
              await this.updateState({ isFetching: true });
            }

            const partialStateUpdate: Partial<WatchedQueryState<Data>> = {};

            // Always run the query if an underlying table has changed
            const result = await watchOptions.query.execute({
              sql: compiledQuery.sql,
              // Allows casting from ReadOnlyArray[unknown] to Array<unknown>
              // This allows simpler compatibility with PowerSync queries
              parameters: [...compiledQuery.parameters],
              db: this.options.db
            });

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
              await this.updateState(partialStateUpdate);
            }
          } catch (error) {
            await this.updateState({ error });
          }
        },
        onError: async (error) => {
          await this.updateState({ error });
        }
      },
      {
        signal: abortSignal,
        tables,
        throttleMs: watchOptions.throttleMs,
        triggerImmediate: true // used to emit the initial state
      }
    );
  }
}
