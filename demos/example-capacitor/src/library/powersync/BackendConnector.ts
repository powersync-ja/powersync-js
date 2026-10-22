import { AbstractPowerSyncDatabase, PowerSyncBackendConnector } from '@powersync/web';

export class BackendConnector implements PowerSyncBackendConnector {
  private powersyncUrl: string | undefined;
  private backendUrl: string;

  constructor() {
    this.powersyncUrl = import.meta.env.VITE_POWERSYNC_URL;
    // Empty means the page's own origin; the Vite dev server proxies `/api` to the backend.
    this.backendUrl = import.meta.env.VITE_BACKEND_URL ?? '';
  }

  async fetchCredentials() {
    if (!this.powersyncUrl) {
      // Local-only mode.
      return null;
    }

    const response = await fetch(`${this.backendUrl}/api/auth/token`);
    if (response.status != 200) {
      throw new Error(`Could not fetch a token: HTTP ${response.status}`);
    }
    const { token } = await response.json();

    return {
      endpoint: this.powersyncUrl,
      token
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();

    if (!transaction) {
      return;
    }

    try {
      const batch = transaction.crud.map((op) => ({
        table: op.table,
        op: op.op,
        id: op.id,
        data: op.opData
      }));

      const response = await fetch(`${this.backendUrl}/api/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch })
      });
      if (response.status !== 200) {
        throw new Error(`Server returned HTTP ${response.status}: ${await response.text()}`);
      }

      await transaction.complete();
    } catch (error: any) {
      if (shouldDiscardDataOnError(error)) {
        // Instead of blocking the queue with these errors, discard the (rest of the) transaction.
        //
        // Note that these errors typically indicate a bug in the application.
        // If protecting against data loss is important, save the failing records
        // elsewhere instead of discarding, and/or notify the user.
        console.error(`Data upload error - discarding`, error);
        await transaction.complete();
      } else {
        // Error may be retryable - e.g. network error or temporary server error.
        // Throwing an error here causes this call to be retried after a delay.
        throw error;
      }
    }
  }
}

function shouldDiscardDataOnError(error: any) {
  // TODO: Ignore non-retryable errors here
  return false;
}
