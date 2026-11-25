import type { Authenticator, MutationUploader, ResolveCredentialsOptions } from '@powersync/web';

export class BackendConnector implements Authenticator {
  private backendUrl: string;

  constructor() {
    // Empty means the page's own origin; the Vite dev server proxies `/api` to the backend.
    this.backendUrl = import.meta.env.VITE_BACKEND_URL ?? '';
  }

  async resolveCredentials({ abort }: ResolveCredentialsOptions): Promise<string> {
    const response = await fetch(`${this.backendUrl}/api/auth/token`, { signal: abort });
    if (response.status != 200) {
      throw new Error(`Could not fetch a token: HTTP ${response.status}`);
    }
    const { token } = await response.json();

    return token;
  }

  readonly upload: MutationUploader = async ({ database }) => {
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
  };
}

function shouldDiscardDataOnError(error: any) {
  // TODO: Ignore non-retryable errors here
  return false;
}
