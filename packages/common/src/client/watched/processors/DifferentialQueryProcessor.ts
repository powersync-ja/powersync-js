import { WatchCompatibleQuery, WatchedQuery, WatchedQueryOptions, WatchedQueryState } from '../WatchedQuery.js';
import { AbstractQueryProcessor, AbstractQueryProcessorOptions, LinkQueryOptions } from './AbstractQueryProcessor.js';

/**
 * Represents an updated row in a differential watched query.
 * It contains both the current and previous state of the row.
 */
export interface WatchedQueryRowDifferential<RowType> {
  readonly current: RowType;
  readonly previous: RowType;
}

/**
 * Represents the result of a watched query that has been differentiated.
 * {@link WatchedQueryState.data} is of the {@link WatchedQueryDifferential} form when using the {@link IncrementalWatchMode.DIFFERENTIAL} mode.
 */
export interface WatchedQueryDifferential<RowType> {
  added: ReadonlyArray<RowType>;
  /**
   * The entire current result set.
   * Array item object references are preserved between updates if the item is unchanged.
   *
   * e.g. In the query
   * ```sql
   *  SELECT name, make FROM assets ORDER BY make ASC;
   * ```
   *
   * If a previous result set contains an item (A) `{name: 'pc', make: 'Cool PC'}` and
   * an update has been made which adds another item (B) to the result set (the item A is unchanged) - then
   * the updated result set will be contain the same object reference,to item A, as the previous resultset.
   * This is regardless of the item A's position in the updated result set.
   */
  all: ReadonlyArray<RowType>;
  removed: ReadonlyArray<RowType>;
  updated: ReadonlyArray<WatchedQueryRowDifferential<RowType>>;
  unchanged: ReadonlyArray<RowType>;
}

/**
 * Differentiator for incremental watched queries which allows to identify and compare items in the result set.
 */
export interface WatchedQueryDifferentiator<RowType> {
  /**
   * Unique identifier for the item.
   */
  identify: (item: RowType) => string;
  /**
   * Generates a key for comparing items with matching identifiers.
   */
  compareBy: (item: RowType) => string;
}

/**
 * Settings for incremental watched queries using the {@link IncrementalWatchMode.DIFFERENTIAL} mode.
 */
export interface DifferentialWatchedQuerySettings<RowType> extends WatchedQueryOptions {
  /**
   * The query here must return an array of items that can be differentiated.
   */
  query: WatchCompatibleQuery<RowType[]>;

  /**
   * Initial result data which is presented while the initial loading is executing.
   * Defaults to an empty differential.
   */
  placeholderData?: WatchedQueryDifferential<RowType>;
}

/**
 * @internal
 */
export interface DifferentialQueryProcessorOptions<RowType>
  extends AbstractQueryProcessorOptions<WatchedQueryDifferential<RowType>, DifferentialWatchedQuerySettings<RowType>> {
  differentiator: WatchedQueryDifferentiator<RowType>;
}

type DataHashMap<RowType> = Map<string, { hash: string; item: RowType }>;

/**
 * An empty differential result set.
 * This is used as the initial state for differential incrementally watched queries.
 */
export const EMPTY_DIFFERENTIAL = {
  added: [],
  all: [],
  removed: [],
  updated: [],
  unchanged: []
};

/**
 * Uses the PowerSync onChange event to trigger watched queries.
 * Results are emitted on every change of the relevant tables.
 * @internal
 */
export class DifferentialQueryProcessor<RowType>
  extends AbstractQueryProcessor<WatchedQueryDifferential<RowType>, DifferentialWatchedQuerySettings<RowType>>
  implements WatchedQuery<WatchedQueryDifferential<RowType>, DifferentialWatchedQuerySettings<RowType>>
{
  constructor(protected options: DifferentialQueryProcessorOptions<RowType>) {
    super(options);
  }

  /*
   * @returns If the sets are equal
   */
  protected differentiate(
    current: RowType[],
    previousMap: DataHashMap<RowType>
  ): { diff: WatchedQueryDifferential<RowType>; map: DataHashMap<RowType>; hasChanged: boolean } {
    const { identify, compareBy } = this.options.differentiator;

    let hasChanged = false;
    const currentMap = new Map<string, { hash: string; item: RowType }>();
    const removedTracker = new Set(previousMap.keys());

    // Allow mutating to populate the data temporarily.
    const diff = {
      all: [] as RowType[],
      added: [] as RowType[],
      removed: [] as RowType[],
      updated: [] as WatchedQueryRowDifferential<RowType>[],
      unchanged: [] as RowType[]
    };

    /**
     * Looping over the current result set array is important to preserve
     * the ordering of the result set.
     * We can replace items in the current array with previous object references if they are equal.
     */
    for (const item of current) {
      const key = identify(item);
      const hash = compareBy(item);
      currentMap.set(key, { hash, item });

      const previousItem = previousMap.get(key);
      if (!previousItem) {
        // New item
        hasChanged = true;
        diff.added.push(item);
        diff.all.push(item);
      } else {
        // Existing item
        if (hash == previousItem.hash) {
          diff.unchanged.push(item);
          // Use the previous object reference
          diff.all.push(previousItem.item);
        } else {
          hasChanged = true;
          diff.updated.push({ current: item, previous: previousItem.item });
          // Use the new reference
          diff.all.push(item);
        }
      }
      // The item is present, we don't consider it removed
      removedTracker.delete(key);
    }

    diff.removed = Array.from(removedTracker).map((key) => previousMap.get(key)!.item);
    hasChanged = hasChanged || diff.removed.length > 0;

    return {
      diff,
      hasChanged,
      map: currentMap
    };
  }

  protected async linkQuery(options: LinkQueryOptions<WatchedQueryDifferential<RowType>>): Promise<void> {
    const { db, watchOptions } = this.options;
    const { abortSignal } = options;

    const compiledQuery = watchOptions.query.compile();
    const tables = await db.resolveTables(compiledQuery.sql, compiledQuery.parameters as any[]);

    let currentMap: DataHashMap<RowType> = new Map();

    // populate the currentMap from the placeholder data
    if (this.state.data) {
      this.state.data.all.forEach((item) => {
        currentMap.set(this.options.differentiator.identify(item), {
          hash: this.options.differentiator.compareBy(item),
          item
        });
      });
    }

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

            const partialStateUpdate: Partial<WatchedQueryState<WatchedQueryDifferential<RowType>>> & {
              data?: WatchedQueryDifferential<RowType>;
            } = {};

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

            const { diff, hasChanged, map } = this.differentiate(result, currentMap);
            // Update for future comparisons
            currentMap = map;

            if (hasChanged) {
              partialStateUpdate.data = diff;
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
