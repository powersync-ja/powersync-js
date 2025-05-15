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

export abstract class AbstractQueryProcessor<T>
  extends BaseObserver<AbstractQueryListener<T>>
  implements WatchedQueryProcessor<T>
{
  readonly state: WatchedQueryState<T> = {
    loading: true,
    fetching: true,
    error: null,
    lastUpdated: null,
    data: {
      all: [],
      delta: () => ({ added: [], removed: [], unchanged: [], updated: [] })
    }
  };

  protected _stream: DataStream<WatchedQueryState<T>> | null;

  constructor(protected options: AbstractQueryProcessorOptions<T>) {
    super();
    this._stream = null;
  }

  /**
   * Updates the underlaying query.
   */
  updateQuery(query: WatchedQueryOptions<T>) {
    this.options.watchedQuery = query;
    if (this._stream) {
      this.iterateAsyncListeners(async (l) => l.queryUpdated?.(query)).catch((error) => {
        this._stream!.iterateListeners((l) => l.error?.(error));
      });
    }
  }

  /**
   * This method is called when the stream is created or the PowerSync schema has updated.
   * It links the stream to the underlaying query.
   * @param stream The stream to link to the underlaying query.
   * @param abortSignal The signal to abort the underlaying query.
   */
  protected abstract linkStream(options: LinkQueryStreamOptions<T>): Promise<void>;

  async generateStream() {
    if (this._stream) {
      return this._stream;
    }

    const { db } = this.options;

    const stream = new DataStream<WatchedQueryState<T>>({
      logger: db.logger
    });

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

    await link(this.options.watchedQuery);

    db.registerListener({
      schemaChanged: async () => {
        try {
          await link(this.options.watchedQuery);
        } catch (error) {
          stream.iterateListeners((l) => l.error?.(error));
        }
      }
    });

    this.registerListener({
      queryUpdated: async (query) => {
        await link(query);
      }
    });

    // Cancel the underlaying query if the stream is closed
    stream.registerListener({
      closed: () => abortController?.abort()
    });

    this._stream = stream;
    return stream;
  }
}
