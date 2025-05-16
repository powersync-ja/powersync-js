import { WatchedQueryDelta } from '../../WatchedQueryResult.js';

export interface Comparable {
  identity: string;
  hash: string;
}

export interface WatchComparableResult<T> {
  delta(): WatchedQueryDelta<T>;
  isEqual(): boolean;
}

export interface WatchResultComparator<T> {
  compare(previous: T[], current: T[]): WatchComparableResult<T>;
}

export interface SteppedComparisonState<T> {
  currentItems: T[];
  resumeIndex: number;
  delta: WatchedQueryDelta<T>;
  previousHashes: Map<string, string>;
  previousRemovalTracker: Map<string, T>;
  isEqual?: boolean;
}

export abstract class AbstractWatchComparator<T> implements WatchResultComparator<T> {
  abstract identify(item: T): string;
  abstract hash(item: T): string;

  protected stepComparison(
    state: SteppedComparisonState<T>,
    options: {
      /**
       * Only checks if the comparison is equal, the delta is not fully updated.
       */
      validateEquality?: boolean;
    }
  ): void {
    const { validateEquality } = options;

    if (state.currentItems.length == 0 && state.previousHashes.size == 0) {
      state.isEqual = true;
      return;
    }

    if (state.resumeIndex >= state.currentItems.length) {
      // No more items to compare, we are done
      return;
    }

    if (validateEquality && state.isEqual != null) {
      return;
    }

    for (; state.resumeIndex < state.currentItems.length; state.resumeIndex++) {
      const item = state.currentItems[state.resumeIndex];

      const identifier = this.identify(item);
      // This item is present, it has not been removed from the first array
      state.previousRemovalTracker.delete(identifier);

      if (!state.previousHashes.has(identifier)) {
        state.delta.added.push(item);
        if (validateEquality) {
          state.isEqual = false;
          return;
        } else {
          continue;
        }
      }

      const hash = this.hash(item);
      if (state.previousHashes.get(identifier) !== hash) {
        state.delta.updated.push(item);
        if (validateEquality) {
          state.isEqual = false;
          return;
        } else {
          continue;
        }
      }

      state.delta.unchanged.push(item);
    }

    state.delta.removed = Array.from(state.previousRemovalTracker.values());
    state.isEqual =
      state.delta.added.length === 0 && state.delta.removed.length === 0 && state.delta.updated.length === 0;
  }

  compare(previous: T[], current: T[]): WatchComparableResult<T> {
    const mapEntries = previous.map((item) => [this.identify(item), this.hash(item), item]) as [string, string, T][];

    const comparisonState: SteppedComparisonState<T> = {
      currentItems: current,
      resumeIndex: 0,
      delta: {
        added: [],
        removed: [],
        updated: [],
        unchanged: []
      },
      previousHashes: new Map<string, string>(mapEntries.map(([id, hash]) => [id, hash])),
      previousRemovalTracker: new Map<string, T>(mapEntries.map(([id, _, item]) => [id, item]))
    };

    return {
      delta: () => {
        this.stepComparison(comparisonState, { validateEquality: false });
        return comparisonState.delta;
      },
      isEqual: () => {
        this.stepComparison(comparisonState, { validateEquality: true });
        return comparisonState.isEqual!;
      }
    } satisfies WatchComparableResult<T>;
  }
}

export type InlineWatchComparatorOptions<T> = {
  identify: (item: T) => string;
  hash: (item: T) => string;
};

export class InlineWatchComparator<T> extends AbstractWatchComparator<T> {
  constructor(protected options: InlineWatchComparatorOptions<T>) {
    super();
  }

  identify(item: T): string {
    return this.options.identify(item);
  }

  hash(item: T): string {
    return this.options.hash(item);
  }
}

export class DefaultWatchComparator<T extends { id: string }> extends InlineWatchComparator<T> {
  constructor() {
    super({
      identify: (item: T) => item.id,
      hash: (item: T) => JSON.stringify(item)
    });
  }
}
