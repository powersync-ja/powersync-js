import type { CommonPowerSyncDatabase, PowerSyncBackendConnector, PowerSyncCredentials } from '@powersync/web';

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
export class BackendConnector implements PowerSyncBackendConnector {
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

  /** A token for the app's requests to the backend, cached until a minute before it expires. */
  async getToken(): Promise<Token> {
    if (!this.token || this.token.expires_at - Date.now() < TOKEN_REFRESH_MS) {
      this.token = await this.fetchToken();
    }
    return this.token;
  }

  async fetchCredentials() {
    // PowerSync asks for credentials when it connects, and again before they expire or after they're rejected, so
    // this always fetches a new token.
    this.token = await this.fetchToken();

    return {
      endpoint: import.meta.env.VITE_POWERSYNC_URL,
      token: this.token.token,
      expiresAt: new Date(this.token.expires_at)
    } satisfies PowerSyncCredentials;
  }

  /** Uploads one local transaction to the backend, which applies it to Postgres in one transaction. */
  async uploadData(database: CommonPowerSyncDatabase): Promise<void> {
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
      // E.g. the backend is restarting. PowerSync calls uploadData again later, with a new token if this one was
      // rejected.
      if (response.status === 401) this.token = null;
      throw new Error(`Could not upload changes: ${response.status} ${await response.text()}`);
    }

    await transaction.complete();
  }

  private async fetchToken(): Promise<Token> {
    const response = await fetch('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: this.userId })
    });

    if (!response.ok) {
      throw new Error(`Could not fetch a token: ${response.status} ${await response.text()}`);
    }

    return response.json();
  }
}
