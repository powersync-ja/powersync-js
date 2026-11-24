import type { Authenticator, MutationUploader, ResolveCredentialsOptions } from '@powersync/web';

/** Where the app keeps the user id it made up on first load. */
const USER_ID_KEY = 'ai-chat-user-id';
/** A cached token is replaced when it expires within this long. */
const TOKEN_REFRESH_MS = 60 * 1000;

/** A token from the backend. `expires_at` is in milliseconds since the epoch. */
type Token = { token: string; expires_at: number };

/**
 * Connects PowerSync to this demo's backend (server/): the backend issues the token that PowerSync and the backend
 * both accept, and applies uploaded changes to Postgres.
 *
 * There is no sign-in. On first load, the app makes up a random user id and keeps it in localStorage, and the backend
 * issues a token for whichever user id it's given. This stands in for real sign-in: anyone who knows a user id can get
 * a token for it.
 */
export class BackendConnector implements Authenticator {
  readonly userId: string;

  private token: Token | null = null;

  constructor() {
    let userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem(USER_ID_KEY, userId);
    }
    this.userId = userId;
  }

  /** A token for PowerSync and the app's backend requests, cached until a minute before it expires. */
  async getToken(abort?: AbortSignal): Promise<Token> {
    if (!this.token || this.token.expires_at - Date.now() < TOKEN_REFRESH_MS) {
      this.token = await this.fetchToken(abort);
    }
    return this.token;
  }

  async resolveCredentials({ abort }: ResolveCredentialsOptions): Promise<string> {
    return (await this.getToken(abort)).token;
  }

  invalidateCredentials(): void {
    this.token = null;
  }

  /** Uploads one local transaction to the backend, which applies it to Postgres in one transaction. */
  readonly upload: MutationUploader = async ({ database }) => {
    const transaction = await database.getNextCrudTransaction();

    if (!transaction) {
      return;
    }

    const { token } = await this.getToken();
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        operations: transaction.crud.map((op) => ({ op: op.op, table: op.table, id: op.id, data: op.opData }))
      })
    });

    if (response.status === 422 || response.status === 413) {
      // The backend can never apply this transaction, e.g. it breaks a constraint or is too large. Retrying can't
      // succeed, so discard it.
      console.error('Data upload error - discarding:', transaction.crud, await response.text());
    } else if (!response.ok) {
      // E.g. the backend is restarting. PowerSync calls the uploader again later, with a new token if this one was
      // rejected.
      if (response.status === 401) this.invalidateCredentials();
      throw new Error(`Could not upload changes: ${response.status} ${await response.text()}`);
    }

    await transaction.complete();
  };

  private async fetchToken(abort?: AbortSignal): Promise<Token> {
    const response = await fetch('/api/auth/token', {
      method: 'POST',
      signal: abort,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: this.userId })
    });

    if (!response.ok) {
      throw new Error(`Could not fetch a token: ${response.status} ${await response.text()}`);
    }

    return response.json();
  }
}
