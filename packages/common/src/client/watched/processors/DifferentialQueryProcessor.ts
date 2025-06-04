import { WatchCompatibleQuery, WatchedQuery, WatchedQueryOptions, WatchedQueryState } from '../WatchedQuery.js';
import { AbstractQueryProcessor, AbstractQueryProcessorOptions, LinkQueryOptions } from './AbstractQueryProcessor.js';

export interface Differential<RowType> {
  current: RowType;
  previous: RowType;
}

export interface WatchedQueryDifferential<RowType> {
  added: RowType[];
  all: RowType[];
  removed: RowType[];
  updated: Differential<RowType>[];
  unchanged: RowType[];
}

export interface Differentiator<RowType> {
  identify: (item: RowType) => string;
  compareBy: (item: RowType) => string;
}

export interface DifferentialWatchedQuerySettings<RowType>
  extends WatchedQueryOptions<WatchedQueryDifferential<RowType>> {
  query: WatchCompatibleQuery<RowType[]>;
}

/**
 * @internal
 */
export interface DifferentialQueryProcessorOptions<RowType>
  extends AbstractQueryProcessorOptions<WatchedQueryDifferential<RowType>, DifferentialWatchedQuerySettings<RowType>> {
  differentiator: Differentiator<RowType>;
}

type DataHashMap<RowType> = Map<string, { hash: string; item: RowType }>;

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
    current.forEach((item) => {
      currentMap.set(identify(item), {
        hash: compareBy(item),
        item
      });
    });

    const removedTracker = new Set(previousMap.keys());

    const diff: WatchedQueryDifferential<RowType> = {
      all: current,
      added: [],
      removed: [],
      updated: [],
      unchanged: []
    };

    for (const [key, { hash, item }] of currentMap) {
      const previousItem = previousMap.get(key);
      if (!previousItem) {
        // New item
        hasChanged = true;
        diff.added.push(item);
      } else {
        // Existing item
        if (hash == previousItem.hash) {
          diff.unchanged.push(item);
        } else {
          hasChanged = true;
          diff.updated.push({ current: item, previous: previousItem.item });
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

            const partialStateUpdate: Partial<WatchedQueryState<WatchedQueryDifferential<RowType>>> = {};

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
