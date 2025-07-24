/**
 * A basic comparator for incrementally watched queries. This performs a single comparison which
 * determines if the result set has changed. The {@link WatchedQuery} will only emit the new result
 * if a change has been detected.
 */
export interface WatchedQueryComparator<Data> {
  checkEquality: (current: Data, previous: Data) => boolean;
}

/**
 * Options for {@link ArrayComparator}
 */
export type ArrayComparatorOptions<ItemType> = {
  /**
   * Returns a string to uniquely identify an item in the array.
   */
  compareBy: (item: ItemType) => string;
};

/**
 * An efficient comparator for {@link WatchedQuery} created with {@link Query#watch}. This has the ability to determine if a query
 * result has changes without necessarily processing all items in the result.
 */
export class ArrayComparator<ItemType> implements WatchedQueryComparator<ItemType[]> {
  constructor(protected options: ArrayComparatorOptions<ItemType>) {}

  checkEquality(current: ItemType[], previous: ItemType[]) {
    if (current.length === 0 && previous.length === 0) {
      return true;
    }

    if (current.length !== previous.length) {
      return false;
    }

    const { compareBy } = this.options;

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
}

/**
 * Watched query comparator that always reports changed result sets.
 */
export const FalsyComparator: WatchedQueryComparator<unknown> = {
  checkEquality: () => false // Default comparator that always returns false
};
