import { DataStream } from '../../utils/DataStream.js';
import { WatchedQuery, WatchedQueryOptions, WatchedQueryProcessor, WatchedQueryState } from './WatchedQuery.js';

export interface WatchedQueryImplOptions<T> {
  processor: WatchedQueryProcessor<T>;
}

export class WatchedQueryImpl<T> implements WatchedQuery<T> {
  protected lazyStreamPromise: Promise<DataStream<WatchedQueryState<T>>>;

  constructor(protected options: WatchedQueryImplOptions<T>) {
    this.lazyStreamPromise = this.options.processor.generateStream();
  }

  get state() {
    return this.options.processor.state;
  }

  updateQuery(query: WatchedQueryOptions<T>): void {
    this.options.processor.updateQuery(query);
  }

  stream(): DataStream<WatchedQueryState<T>> {
    // Return a new stream which can independently be closed from the original
    const stream = new DataStream<WatchedQueryState<T>>({
      closeOnError: true
    });

    // pipe the lazy stream to the new stream
    this.lazyStreamPromise
      .then((s) => {
        s.registerListener({
          data: async (data) => {
            stream.enqueueData(data);
          },
          closed: () => {
            stream.close();
          },
          error: (error) => {
            stream.iterateListeners((l) => l.error?.(error));
          }
        });
      })
      .catch((error) => {
        stream.iterateListeners((l) => l.error?.(error));
      });

    return stream;
  }

  close(): void {
    console.log('Closing WatchedQueryImpl for ', this.options.processor);
    this.lazyStreamPromise.then((s) => {
      console.log('Closing stream for ', this.options.processor);
      s.close();
    });
  }
}
