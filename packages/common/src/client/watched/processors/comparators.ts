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
 * Compares array results of watched queries for incrementally watched queries created in the standard mode.
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
