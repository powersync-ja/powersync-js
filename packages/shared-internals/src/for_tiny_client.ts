/**
 * Internal entrypoint used by `@powersync/tiny-client`.
 *
 * This only exposes utilities that don't depend on the rest of this package, so that the tiny client doesn't have to
 * load (or bundle) the full SDK internals. It is not a public API.
 */
export {
  doneResult,
  extractJsonLines,
  injectable,
  map,
  valueResult,
  type InjectableIterator,
  type SimpleAsyncIterator
} from './utils/stream_transform.js';
