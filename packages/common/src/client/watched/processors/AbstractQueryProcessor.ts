import { AbstractPowerSyncDatabase } from '../../../client/AbstractPowerSyncDatabase.js';
import { BaseListener, BaseObserver } from '../../../utils/BaseObserver.js';
import { DataStream } from '../../../utils/DataStream.js';
import { WatchedQueryOptions, WatchedQueryProcessor, WatchedQueryState } from '../WatchedQuery.js';

export interface AbstractQueryProcessorOptions<T> {
  db: AbstractPowerSyncDatabase;
  watchedQuery: WatchedQueryOptions<T>;
}

export interface AbstractQueryListener<T> extends BaseListener {
  queryUpdated: (query: WatchedQueryOptions<T>) => Promise<void>;
}

export interface LinkQueryStreamOptions<T> {
  stream: DataStream<WatchedQueryState<T>>;
  abortSignal: AbortSignal;
  query: WatchedQueryOptions<T>;
}

/**
 * Limits a stream on high water to only keep the latest event.
 */
export const limitStreamDepth = <T>(stream: DataStream<T>, limit: number) => {
  const l = stream.registerListener({
    closed: () => l(),
    highWater: async () => {
      // Splice the queue to only keep the latest event
      stream.dataQueue.splice(0, stream.dataQueue.length - limit);
    }
  });
  return stream;
};

export abstract class AbstractQueryProcessor<T>
  extends BaseObserver<AbstractQueryListener<T>>
  implements WatchedQueryProcessor<T>
{
  readonly state: WatchedQueryState<T> = {
    isLoading: true,
    isFetching: true,
    error: null,
    lastUpdated: null,
    data: []
  };

  protected _stream: DataStream<WatchedQueryState<T>> | null;

  constructor(protected options: AbstractQueryProcessorOptions<T>) {
    super();
    this._stream = null;
  }

  protected get reportFetching() {
    return this.options.watchedQuery.reportFetching ?? true;
  }

  /**
   * Updates the underlaying query.
   */
  updateQuery(query: WatchedQueryOptions<T>) {
    this.options.watchedQuery = query;

    if (this._stream) {
      this.iterateAsyncListeners(async (l) => l.queryUpdated?.(query)).catch((error) => {
        this.updateState({ error });
      });
    }
  }

  /**
   * This method is called when the stream is created or the PowerSync schema has updated.
   * It links the stream to the underlaying query.
   */
  protected abstract linkStream(options: LinkQueryStreamOptions<T>): Promise<void>;

  protected updateState(update: Partial<WatchedQueryState<T>>) {
    Object.assign(this.state, { lastUpdated: new Date() } satisfies Partial<WatchedQueryState<T>>, update);

    if (this._stream?.closed) {
      // Don't enqueue data in a closed stream.
      // it should be safe to ignore this.
      // This can be triggered if the stream is closed while data is being fetched.
      return;
    }
    this._stream?.enqueueData({ ...this.state });
  }

  async generateStream() {
    if (this._stream) {
      return this._stream;
    }

    const { db } = this.options;

    const stream = new DataStream<WatchedQueryState<T>>({
      logger: db.logger,
      pressure: {
        highWaterMark: 2 // Trigger event when 2 events are queued
      }
    });

    limitStreamDepth(stream, 1);

    this._stream = stream;

    let abortController: AbortController | null = null;

    const link = async (query: WatchedQueryOptions<T>) => {
      abortController?.abort();
      abortController = new AbortController();
      await this.linkStream({
        stream,
        abortSignal: abortController.signal,
        query
      });
    };

    db.registerListener({
      schemaChanged: async () => {
        try {
          await link(this.options.watchedQuery);
        } catch (error) {
          this.updateState({ error });
        }
      },
      closing: () => {
        stream.close().catch(() => {});
      }
    });

    this.registerListener({
      queryUpdated: async (query) => {
        try {
          await link(query);
        } catch (error) {
          this.updateState({ error });
        }
      }
    });

    // Cancel the underlaying query if the stream is closed
    stream.registerListener({
      closed: () => abortController?.abort()
    });

    try {
      await link(this.options.watchedQuery);
    } catch (error) {
      this.updateState({ error });
    }

    return stream;
  }
}
