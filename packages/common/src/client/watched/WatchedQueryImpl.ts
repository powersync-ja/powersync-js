import { DataStream } from '../../utils/DataStream.js';
import { limitStreamDepth } from './processors/AbstractQueryProcessor.js';
import { WatchedQuery, WatchedQueryOptions, WatchedQueryProcessor, WatchedQueryState } from './WatchedQuery.js';

export interface WatchedQueryImplOptions<T> {
  processor: WatchedQueryProcessor<T>;
}

export class WatchedQueryImpl<T> implements WatchedQuery<T> {
  protected lazyStreamPromise: Promise<DataStream<WatchedQueryState<T>>>;
  protected _stream: DataStream<WatchedQueryState<T>> | null;

  constructor(protected options: WatchedQueryImplOptions<T>) {
    this._stream = null;
    this.lazyStreamPromise = this.options.processor.generateStream().then((s) => {
      this._stream = s;
      return s;
    });
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
      closeOnError: true,
      pressure: {
        // limit the number of events queued in the event of slow consumers
        highWaterMark: 2
      }
    });

    limitStreamDepth(stream, 1);

    // pipe the lazy stream to the new stream
    this.lazyStreamPromise
      .then((upstreamSource) => {
        // Edge case where the stream is closed before the upstream source is created
        if (stream.closed) {
          return;
        }

        const dispose = upstreamSource.registerListener({
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

        stream.registerListener({
          closed: () => {
            dispose();
          }
        });
      })
      .catch((error) => {
        stream.iterateListeners((l) => l.error?.(error));
      });

    return stream;
  }

  close(): void {
    if (this._stream) {
      this._stream.close().catch(() => {});
      return;
    }
    this.lazyStreamPromise
      .then(async (s) => {
        await s.close();
      })
      .catch(() => {
        // In rare cases where the DB might be closed before the stream is created
        // this can throw an error.
        // This should not affect closing
      });
  }
}
