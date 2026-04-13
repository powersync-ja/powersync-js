import { AbstractPowerSyncDatabase, CrudEntry, PowerSyncBackendConnector } from '@powersync/web';

export class BackendConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const res = await fetch('/api/auth/token');
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body.error ?? `Failed to fetch credentials (${res.status} ${res.statusText})`);
    }
    return { endpoint: body.powersync_url, token: body.token };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    try {
      const batch = transaction.crud.map((entry: CrudEntry) => ({
        op: entry.op as string,
        table: entry.table,
        id: entry.id,
        data: entry.opData
      }));

      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch })
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(`Upload failed (${res.status}): ${body.error ?? res.statusText}`);
      }

      await transaction.complete();
    } catch (error: unknown) {
      if (isFatalError(error)) {
        console.error('Discarding transaction due to fatal error', error);
        await transaction.complete();
      } else {
        throw error;
      }
    }
  }
}

function isFatalError(error: unknown): boolean {
  if (error instanceof Error) {
    return /violates|duplicate key|not-null constraint/i.test(error.message);
  }
  return false;
}
