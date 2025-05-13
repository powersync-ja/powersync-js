export interface Comparable {
  identity: string;
  hash: string;
}

export interface WatchComparisonResult<T> {
  added: T[];
  removed: T[];
  updated: T[];
  unchanged: T[];
  isEqual: boolean;
}

export interface WatchComparator<T> {
  compare(a: T[], b: T[]): WatchComparisonResult<T>;
}

export abstract class AbstractWatchComparator<T> implements WatchComparator<T> {
  abstract identify(item: T): string;
  abstract hash(item: T): string;

  compare(a: T[], b: T[]): WatchComparisonResult<T> {
    const mapEntries = a.map((item) => [this.identify(item), this.hash(item), item]) as [string, string, T][];
    const aMap = new Map<string, string>(mapEntries.map(([id, hash]) => [id, hash]));
    const aRemoved = new Map<string, T>(mapEntries.map(([id, _, item]) => [id, item]));

    const result: WatchComparisonResult<T> = {
      added: [],
      removed: [],
      updated: [],
      unchanged: [],
      isEqual: false
    };

    for (const item of b) {
      const identifier = this.identify(item);
      // This item is present, it has not been removed from the first array
      aRemoved.delete(identifier);

      if (!aMap.has(identifier)) {
        result.added.push(item);
        continue;
      }

      const hash = this.hash(item);
      if (aMap.get(identifier) !== hash) {
        result.updated.push(item);
        continue;
      }

      result.unchanged.push(item);
    }

    result.removed = Array.from(aRemoved.values());
    result.isEqual = result.added.length == 0 && result.updated.length == 0;
    return result;
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
