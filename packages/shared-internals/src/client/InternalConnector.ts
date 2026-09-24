import {
  DownloadOptions,
  PowerSyncBackendConnector,
  PowerSyncCredentials,
  SyncOptions,
  UploadOptions
} from '@powersync/common';
import { BasePowerSyncDatabase } from './BasePowerSyncDatabase.js';

export interface InternalConnector {
  fetchCredentials?: (signal?: AbortSignal) => Promise<PowerSyncCredentials | null>;
  invalidateCredentials?: () => void | Promise<void>;
  postCheckpointRequest?: (clientId: string, requestId: string, signal?: AbortSignal) => Promise<string | null> | null;
  uploadCrud?: (signal?: AbortSignal) => Promise<void>;
}

export function normalizeConnectCall(
  database: BasePowerSyncDatabase,
  connector: PowerSyncBackendConnector | (SyncOptions & (DownloadOptions | UploadOptions)),
  options?: SyncOptions
): [InternalConnector, SyncOptions] {
  const internalConnector: InternalConnector = {};
  let resolvedOptions: SyncOptions | undefined;

  if ('fetchCredentials' in connector) {
    // This is an old-style PowerSyncBackendConnector
    resolvedOptions = options;

    internalConnector.fetchCredentials = connector.fetchCredentials.bind(connector);
    internalConnector.uploadCrud = () => {
      return connector.uploadData(database);
    };

    const customCheckpoints = connector.postCheckpointRequest;
    if (customCheckpoints) {
      internalConnector.postCheckpointRequest = customCheckpoints.bind(connector);
    }
  } else {
    resolvedOptions = connector;

    if ('authenticator' in connector) {
      const auth = connector.authenticator;
      const endpoint = connector.powerSyncEndpoint;

      internalConnector.fetchCredentials = async (signal) => {
        const token = await auth.resolveCredentials({ abort: signal });
        return { endpoint, token };
      };

      const customCheckpoints = auth.postCheckpointRequest;
      if (customCheckpoints) {
        internalConnector.postCheckpointRequest = customCheckpoints.bind(auth);
      }
    }
    if ('upload' in connector) {
      internalConnector.uploadCrud = (signal) => {
        return connector.upload({ database, abort: signal });
      };
    }
  }

  return [internalConnector, resolvedOptions ?? {}];
}
