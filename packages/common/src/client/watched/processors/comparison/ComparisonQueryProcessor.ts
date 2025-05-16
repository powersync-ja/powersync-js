import { WatchedQueryResult } from '../../WatchedQueryResult.js';
import { AbstractQueryProcessorOptions } from '../AbstractQueryProcessor.js';
import { OnChangeQueryProcessor } from '../OnChangeQueryProcessor.js';
import { WatchResultComparator } from './WatchComparator.js';

export interface ComparisonQueryProcessorOptions<T> extends AbstractQueryProcessorOptions<T> {
  comparator: WatchResultComparator<T>;
}
/**
 * TODO:
 * This currently checks if the entire result set has changed.
 * In some cases a deep comparison of the result might be required.
 * For example if result[1] is unchanged, it might be useful to keep the same object reference.
 */
export class ComparisonQueryProcessor<T> extends OnChangeQueryProcessor<T> {
  constructor(protected options: ComparisonQueryProcessorOptions<T>) {
    super(options);
  }

  protected processResultSet(result: T[]): WatchedQueryResult<T> | null {
    const { comparator } = this.options;
    const previous = this.state.data.all;
    const delta = comparator.compare(previous, result);

    if (delta.isEqual()) {
      return null; // the stream will not emit a change of data
    }

    return {
      all: result,
      delta: () => delta.delta() // lazy evaluation
    };
  }
}
