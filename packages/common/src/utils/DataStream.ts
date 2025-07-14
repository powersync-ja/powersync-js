import Logger, { ILogger } from 'js-logger';
import { BaseListener, BaseObserver } from './BaseObserver.js';

export type DataStreamOptions<ParsedData, SourceData> = {
  mapLine?: (line: SourceData) => ParsedData;

  /**
   * Close the stream if any consumer throws an error
   */
  closeOnError?: boolean;
  pressure?: {
    highWaterMark?: number;
    lowWaterMark?: number;
  };
  logger?: ILogger;
};

export type DataStreamCallback<Data extends any = any> = (data: Data) => Promise<void>;

export interface DataStreamListener<Data extends any = any> extends BaseListener {
  data: (data: Data) => Promise<void>;
  closed: () => void;
  error: (error: Error) => void;
  highWater: () => Promise<void>;
  lowWater: () => Promise<void>;
}

export const DEFAULT_PRESSURE_LIMITS = {
  highWater: 10,
  lowWater: 0
};

/**
 * A very basic implementation of a data stream with backpressure support which does not use
 * native JS streams or async iterators.
 * This is handy for environments such as React Native which need polyfills for the above.
 */
export class DataStream<ParsedData, SourceData = any> extends BaseObserver<DataStreamListener<ParsedData>> {
  dataQueue: SourceData[];

  protected isClosed: boolean;

  protected processingPromise: Promise<void> | null;
  protected notifyDataAdded: (() => void) | null;

  protected logger: ILogger;

  protected mapLine: (line: SourceData) => ParsedData;

  constructor(protected options?: DataStreamOptions<ParsedData, SourceData>) {
    super();
    this.processingPromise = null;
    this.isClosed = false;
    this.dataQueue = [];
    this.mapLine = options?.mapLine ?? ((line) => line as any);

    this.logger = options?.logger ?? Logger.get('DataStream');

    if (options?.closeOnError) {
      const l = this.registerListener({
        error: (ex) => {
          l?.();
          this.close();
        }
      });
    }
  }

  get highWatermark() {
    return this.options?.pressure?.highWaterMark ?? DEFAULT_PRESSURE_LIMITS.highWater;
  }

  get lowWatermark() {
    return this.options?.pressure?.lowWaterMark ?? DEFAULT_PRESSURE_LIMITS.lowWater;
  }

  get closed() {
    return this.isClosed;
  }

  async close() {
    this.isClosed = true;
    await this.processingPromise;
    this.iterateListeners((l) => l.closed?.());
    // Discard any data in the queue
    this.dataQueue = [];
    this.listeners.clear();
  }

  /**
   * Enqueues data for the consumers to read
   */
  enqueueData(data: SourceData) {
    if (this.isClosed) {
      throw new Error('Cannot enqueue data into closed stream.');
    }

    this.dataQueue.push(data);
    this.notifyDataAdded?.();

    this.processQueue();
  }

  /**
   * Reads data once from the data stream
   * @returns a Data payload or Null if the stream closed.
   */
  async read(): Promise<ParsedData | null> {
    if (this.closed) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const l = this.registerListener({
        data: async (data) => {
          resolve(data);
          // Remove the listener
          l?.();
        },
        closed: () => {
          resolve(null);
          l?.();
        },
        error: (ex) => {
          reject(ex);
          l?.();
        }
      });

      this.processQueue();
    });
  }

  /**
   * Executes a callback for each data item in the stream
   */
  forEach(callback: DataStreamCallback<ParsedData>) {
    if (this.dataQueue.length <= this.lowWatermark) {
      this.iterateAsyncErrored(async (l) => l.lowWater?.());
    }

    return this.registerListener({
      data: callback
    });
  }

  protected processQueue() {
    if (this.processingPromise) {
      return;
    }

    const promise = (this.processingPromise = this._processQueue());
    promise.finally(() => {
      return (this.processingPromise = null);
    });
    return promise;
  }

  protected hasDataReader() {
    return Array.from(this.listeners.values()).some((l) => !!l.data);
  }

  protected async _processQueue() {
    /**
     * Allow listeners to mutate the queue before processing.
     * This allows for operations such as dropping or compressing data
     * on high water or requesting more data on low water.
     */
    if (this.dataQueue.length >= this.highWatermark) {
      await this.iterateAsyncErrored(async (l) => l.highWater?.());
    }

    if (this.isClosed || !this.hasDataReader()) {
      return;
    }

    if (this.dataQueue.length) {
      const data = this.dataQueue.shift()!;
      const mapped = this.mapLine(data);
      await this.iterateAsyncErrored(async (l) => l.data?.(mapped));
    }

    if (this.dataQueue.length <= this.lowWatermark) {
      const dataAdded = new Promise<void>((resolve) => {
        this.notifyDataAdded = resolve;
      });

      await Promise.race([this.iterateAsyncErrored(async (l) => l.lowWater?.()), dataAdded]);
      this.notifyDataAdded = null;
    }

    if (this.dataQueue.length > 0) {
      // Next tick
      setTimeout(() => this.processQueue());
    }
  }

  protected async iterateAsyncErrored(cb: (l: Partial<DataStreamListener<ParsedData>>) => Promise<void>) {
    // Important: We need to copy the listeners, as calling a listener could result in adding another
    // listener, resulting in infinite loops.
    const listeners = Array.from(this.listeners.values());
    for (let i of listeners) {
      try {
        await cb(i);
      } catch (ex) {
        this.logger.error(ex);
        this.iterateListeners((l) => l.error?.(ex));
      }
    }
  }
}
