/**
 * @internal This is implemented in `@powersync/shared-internals`, but we need it in the attachment service
 * implementation.
 */
export interface Mutex {
  runExclusive<T>(fn: () => PromiseLike<T> | T, abort?: AbortSignal): Promise<T>;
}
