import { AbstractPowerSyncDatabase, PowerSyncBackendConnector } from '@powersync/common';

import { AppConfig } from './AppConfig';

export class TestConnector implements PowerSyncBackendConnector {
  constructor() {}

  async fetchCredentials() {
    return {
      endpoint: AppConfig.powersyncUrl,
      token: AppConfig.powersyncToken
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();

    if (!transaction) {
      return;
    }

    try {
      let batch: any[] = [];
      for (let operation of transaction.crud) {
        let payload = {
          op: operation.op,
          table: operation.table,
          id: operation.id,
          data: operation.opData
        };
        batch.push(payload);
      }

      const response = await fetch(`${AppConfig.backendUrl}/api/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ batch })
      });

      if (!response.ok) {
        if (response.status == 400) {
          // We're probably uploading invalid data, no use in retrying.
          await transaction.complete();
        }

        throw new Error(`Received ${response.status} from /api/data: ${await response.text()}`);
      }

      await transaction.complete();
    } catch (ex: any) {
      console.debug(ex);
      throw ex;
    }
  }
}
