/**
 * @public
 */
export interface Disposable {
  dispose: () => Promise<void> | void;
}

/**
 * @public
 */
export type BaseListener = Record<string, ((...event: any) => any) | undefined>;

/**
 * @public
 */
export interface BaseObserverInterface<T extends BaseListener> {
  registerListener(listener: Partial<T>): () => void;
}
