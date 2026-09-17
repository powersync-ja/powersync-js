import type { CommonPowerSyncDatabase, PowerSyncBackendConnector, PowerSyncCredentials } from '@powersync/web';

export interface DevTokenCredentials {
  endpoint: string;
  token: string;
}

/**
 * Connects with a token the host already holds, such as a development token. A diagnostics client
 * never writes, so any local mutation is discarded instead of being uploaded.
 */
export class DevTokenConnector implements PowerSyncBackendConnector {
  constructor(private readonly credentials: DevTokenCredentials) {}

  async fetchCredentials(): Promise<PowerSyncCredentials> {
    return { ...this.credentials };
  }

  async uploadData(database: CommonPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    await transaction?.complete();
  }
}
