import type { StreamingSyncLine, StreamingSyncRequest } from '@powersync/service-core';
import type { SystemDependencies } from '../system/SystemDependencies.js';
import { ndjsonStream } from './ndjson.js';

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    // Set the prototype explicitly
    Object.setPrototypeOf(this, AuthorizationError.prototype);

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthorizationError);
    }
  }
}

export interface BucketRequest {
  name: string;

  /**
   * Base-10 number. Sync all data from this bucket with op_id > after.
   */
  after: string;
}

export type SyncOptions = {
  endpoint: string;
  token: string;
  clientId: string | undefined;
  signal: AbortSignal | undefined;
  bucketPositions: BucketRequest[];
  systemDependencies: SystemDependencies;
};

// TODO This currently uses NDJSON streaming. We should add binary streaming also
export async function openHttpStream(options: SyncOptions): Promise<ReadableStream<StreamingSyncLine>> {
  const streamRequest: StreamingSyncRequest = {
    raw_data: true,
    client_id: options.clientId,
    buckets: options.bucketPositions
  };

  const { fetch } = options.systemDependencies;

  const response = await fetch(options.endpoint + `/sync/stream`, {
    method: `POST`,
    headers: {
      'Content-Type': `application/json`,
      Authorization: `Token ${options.token}`
    },
    body: JSON.stringify(streamRequest),
    signal: options.signal
  });

  if (response.status >= 400 && response.status < 500) {
    const errorText = await response.text();
    throw new AuthorizationError(`Authorization failed: ${errorText}`);
  }

  if (response.status != 200) {
    throw new Error(`Request failed with code: ${response.status}\n${await response.text()}`);
  }

  return ndjsonStream<StreamingSyncLine>(response.body!, options.systemDependencies);
}
