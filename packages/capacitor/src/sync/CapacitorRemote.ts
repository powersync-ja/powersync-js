import { FetchOptions } from '@powersync/shared-internals';
import { WebRemote } from '@powersync/web';

export class CapacitorRemote extends WebRemote {
  protected override fetch(options: FetchOptions): Promise<Response> {
    const headers = options.request.headers;
    if (headers && 'accept' in headers) {
      if (headers.accept.includes('bson-stream')) {
        /**
         * We'd like to avoid passing Binary buffers to SQLite when using
         * iOS and Android for now. This is due to inefficient binary processing.
         * Syncing using Buffers and Capacitor Community SQLite has been observed to be notably
         * slower than the NDJSON option.
         * Capacitor Community SQLite serializes Buffer objects, which causes slowdown
         * ios: https://github.com/capacitor-community/sqlite/blob/f507a1e779688ea72b9d7e8744c647f7b688c568/ios/Plugin/CapacitorSQLite.swift#L888-L912
         * android: https://github.com/capacitor-community/sqlite/blob/master/android/src/main/java/com/getcapacitor/community/database/sqlite/SQLite/UtilsSQLite.java#L141-L147
         * As a rough guideline, the time to locally sync 10_000 small records was observed as:
         * iOS:
         *   - NDJSON: 449ms
         *   - Binary: 68_982ms
         * Android:
         *   - NDJSON: 452ms
         *   - Binary: 1_847ms
         */
        headers.accept = 'application/x-ndjson';
      }
    }

    return super.fetch(options);
  }
}
