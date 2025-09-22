import { WatchCompatibleQuery, WatchedQuery, WatchedQueryListener, WatchedQueryOptions } from '../WatchedQuery.js';
import {
  AbstractQueryProcessor,
  AbstractQueryProcessorOptions,
  LinkQueryOptions,
  MutableWatchedQueryState
} from './AbstractQueryProcessor.js';

/**
 * Represents an updated row in a differential watched query.
 * It contains both the current and previous state of the row.
 */
export interface WatchedQueryRowDifferential<RowType> {
  readonly current: RowType;
  readonly previous: RowType;
}

/**
 * Represents the result of a watched query that has been diffed.
 * {@link DifferentialWatchedQueryState#diff} is of the {@link WatchedQueryDifferential} form.
 */
export interface WatchedQueryDifferential<RowType> {
  readonly added: ReadonlyArray<Readonly<RowType>>;
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
   * the updated result set will be contain the same object reference, to item A, as the previous result set.
   * This is regardless of the item A's position in the updated result set.
   */
  readonly all: ReadonlyArray<Readonly<RowType>>;
  readonly removed: ReadonlyArray<Readonly<RowType>>;
  readonly updated: ReadonlyArray<WatchedQueryRowDifferential<Readonly<RowType>>>;
  readonly unchanged: ReadonlyArray<Readonly<RowType>>;
}

/**
 * Row comparator for differentially watched queries which keys and compares items in the result set.
 */
export interface DifferentialWatchedQueryComparator<RowType> {
  /**
   * Generates a unique key for the item.
   */
  keyBy: (item: RowType) => string;
  /**
   * Generates a token for comparing items with matching keys.
   */
  compareBy: (item: RowType) => string;
}

/**
 * Options for building a differential watched query with the {@link Query} builder.
 */
export interface DifferentialWatchedQueryOptions<RowType> extends WatchedQueryOptions {
  /**
   * Initial result data which is presented while the initial loading is executing.
   */
  placeholderData?: RowType[];

  /**
   * Row comparator used to identify and compare rows in the result set.
   * If not provided, the default comparator will be used which keys items by their `id` property if available,
   * otherwise it uses JSON stringification of the entire item for keying and comparison.
   * @defaultValue {@link DEFAULT_ROW_COMPARATOR}
   */
  rowComparator?: DifferentialWatchedQueryComparator<RowType>;
}

/**
 * Settings for differential incremental watched queries using.
 */
export interface DifferentialWatchedQuerySettings<RowType> extends DifferentialWatchedQueryOptions<RowType> {
  /**
   * The query here must return an array of items that can be differentiated.
   */
  query: WatchCompatibleQuery<RowType[]>;
}

export interface DifferentialWatchedQueryListener<RowType>
  extends WatchedQueryListener<ReadonlyArray<Readonly<RowType>>> {
  onDiff?: (diff: WatchedQueryDifferential<RowType>) => void | Promise<void>;
}

export type DifferentialWatchedQuery<RowType> = WatchedQuery<
  ReadonlyArray<Readonly<RowType>>,
  DifferentialWatchedQuerySettings<RowType>,
  DifferentialWatchedQueryListener<RowType>
>;

/**
 * @internal
 */
export interface DifferentialQueryProcessorOptions<RowType>
  extends AbstractQueryProcessorOptions<RowType[], DifferentialWatchedQuerySettings<RowType>> {
  rowComparator?: DifferentialWatchedQueryComparator<RowType>;
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
 * Default implementation of the {@link DifferentialWatchedQueryComparator} for watched queries.
 * It keys items by their `id` property if available, alternatively it uses JSON stringification
 * of the entire item for the key and comparison.
 */
export const DEFAULT_ROW_COMPARATOR: DifferentialWatchedQueryComparator<any> = {
  keyBy: (item) => {
    if (item && typeof item == 'object' && typeof item['id'] == 'string') {
      return item['id'];
    }
    return JSON.stringify(item);
  },
  compareBy: (item) => JSON.stringify(item)
};

/**
 * Uses the PowerSync onChange event to trigger watched queries.
 * Results are emitted on every change of the relevant tables.
 * @internal
 */
export class DifferentialQueryProcessor<RowType>
  extends AbstractQueryProcessor<ReadonlyArray<Readonly<RowType>>, DifferentialWatchedQuerySettings<RowType>>
  implements DifferentialWatchedQuery<RowType>
{
  protected comparator: DifferentialWatchedQueryComparator<RowType>;

  constructor(protected options: DifferentialQueryProcessorOptions<RowType>) {
    super(options);
    this.comparator = options.rowComparator ?? DEFAULT_ROW_COMPARATOR;
  }

  /*
   * @returns If the sets are equal
   */
  protected differentiate(
    current: RowType[],
    previousMap: DataHashMap<RowType>
  ): { diff: WatchedQueryDifferential<RowType>; map: DataHashMap<RowType>; hasChanged: boolean } {
    const { keyBy, compareBy } = this.comparator;

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
      const key = keyBy(item);
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
          diff.unchanged.push(previousItem.item);
          // Use the previous object reference
          diff.all.push(previousItem.item);
          // update the map to preserve the reference
          currentMap.set(key, previousItem);
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
    const tables = await db.resolveTables(compiledQuery.sql, compiledQuery.parameters as any[], {
      tables: options.settings.triggerOnTables
    });

    let currentMap: DataHashMap<RowType> = new Map();

    // populate the currentMap from the placeholder data
    this.state.data.forEach((item) => {
      currentMap.set(this.comparator.keyBy(item), {
        hash: this.comparator.compareBy(item),
        item
      });
    });

    db.onChangeWithCallback(
      {
        onChange: async () => {
          if (this.closed || abortSignal.aborted) {
            return;
          }
          // This fires for each change of the relevant tables
          try {
            if (this.reportFetching && !this.state.isFetching) {
              await this.updateState({ isFetching: true });
            }

            const partialStateUpdate: Partial<MutableWatchedQueryState<RowType[]>> = {};

            // Always run the query if an underlying table has changed
            const result = await watchOptions.query.execute({
              sql: compiledQuery.sql,
              // Allows casting from ReadOnlyArray[unknown] to Array<unknown>
              // This allows simpler compatibility with PowerSync queries
              parameters: [...compiledQuery.parameters],
              db: this.options.db
            });

            if (abortSignal.aborted) {
              return;
            }

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
              await this.iterateAsyncListenersWithError((l) => l.onDiff?.(diff));
              Object.assign(partialStateUpdate, {
                data: diff.all
              });
            }

            if (this.state.error) {
              partialStateUpdate.error = null;
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
