import type { StreamingSyncLine, StreamingSyncRequest } from '@powersync/service-core';
import type { SystemDependencies } from './SystemDependencies.js';
import { ndjsonStream } from './ndjson.js';

export type SyncOptions = {
  endpoint: string;
  token: string;
  clientId: string | undefined;
  signal: AbortSignal | undefined;
  bucketPositions: Map<string, string>;
  systemDependencies: SystemDependencies;
};

export async function openHttpStream(options: SyncOptions): Promise<ReadableStream<StreamingSyncLine>> {
  const streamRequest: StreamingSyncRequest = {
    raw_data: true,
    client_id: options.clientId,
    buckets: Array.from(options.bucketPositions.entries()).map(([bucket, after]) => ({
      name: bucket,
      after: after
    }))
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

  if (response.status != 200) {
    throw new Error(`Request failed with code: ${response.status}\n${await response.text()}`);
  }

  return ndjsonStream<StreamingSyncLine>(response.body!, options.systemDependencies);
}
