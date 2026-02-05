import { AbstractPowerSyncDatabase, PowerSyncBackendConnector } from '@powersync/web';
import { connect } from './ConnectionManager';
import { LoginDetailsFormValues } from '@/components/widgets/LoginDetailsWidget';
import { localStateDb } from './LocalStateManager';

const APP_SETTINGS_KEY_CREDENTIALS = 'powersync_credential';

export interface Credentials {
  token: string;
  endpoint: string;
}

export class TokenConnector implements PowerSyncBackendConnector {
  async fetchCredentials(): Promise<Credentials | null> {
    const rows = await localStateDb.getAll<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ?',
      [APP_SETTINGS_KEY_CREDENTIALS]
    );
    const row = rows[0];
    if (!row?.value) return null;
    const parsed = JSON.parse(row.value) as Credentials;
    return parsed.token && parsed.endpoint ? parsed : null;
  }

  async uploadData(database: AbstractPowerSyncDatabase) {
    const tx = await database.getNextCrudTransaction();
    await tx?.complete();
  }

  async signIn(credentials: LoginDetailsFormValues) {
    validateSecureContext(credentials.endpoint);
    checkJWT(credentials.token);
    try {
      await this.saveCredentials(credentials);
      await connect();
    } catch (e) {
      await this.clearCredentials();
      throw e;
    }
  }

  async hasCredentials(): Promise<boolean> {
    const rows = await localStateDb.getAll<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ?',
      [APP_SETTINGS_KEY_CREDENTIALS]
    );
    return rows.length > 0;
  }

  async saveCredentials(credentials: LoginDetailsFormValues): Promise<void> {
    const value = JSON.stringify({ token: credentials.token, endpoint: credentials.endpoint });
    await localStateDb.execute(
      'INSERT OR REPLACE INTO app_settings (id, key, value) VALUES (?, ?, ?)',
      [APP_SETTINGS_KEY_CREDENTIALS, APP_SETTINGS_KEY_CREDENTIALS, value]
    );
  }

  async clearCredentials(): Promise<void> {
    await localStateDb.execute('DELETE FROM app_settings WHERE key = ?', [APP_SETTINGS_KEY_CREDENTIALS]);
  }
}

function validateSecureContext(url: string) {
  if (!location.href.startsWith('https:')) {
    return;
  }
  const parsedUrl = new URL(url);
  const secure =
    parsedUrl.protocol === 'https:' ||
    parsedUrl.hostname === 'localhost' ||
    parsedUrl.hostname === '127.0.0.1' ||
    parsedUrl.hostname === '::1';
  if (!secure) {
    throw new Error(`Cannot connect to http endpoints from the hosted diagnostics app.
Run either the PowerSync endpoint on http://localhost, or the diagnostics app on http://localhost.`);
  }
}

function checkJWT(token: string) {
  // Split the token into parts by "."
  const parts = token.split('.');

  // Check that it has exactly three parts (header, payload, signature)
  if (parts.length !== 3) {
    throw new Error(`Token must be a JWT: Expected 3 parts, got ${parts.length}`);
  }

  // Check that each part is base64 or base64url encoded
  const base64UrlRegex = /^[A-Za-z0-9-_]+$/;

  const isBase64 = parts.every((part) => base64UrlRegex.test(part));
  if (!isBase64) {
    throw new Error(`Token must be a JWT: Not all parts are base64 encoded`);
  }
}

export function getTokenEndpoint(token: string): string | null {
  try {
    const [head, body, signature] = token.split('.');
    const payload = JSON.parse(atob(body));
    const aud = payload.aud as string | string[] | undefined;
    const audiences = Array.isArray(aud) ? aud : [aud];

    // Prioritize public powersync URL
    for (let aud of audiences) {
      if (aud?.match(/^https?:.*.journeyapps.com/)) {
        return aud;
      }
    }

    // Fallback to any URL
    for (let aud of audiences) {
      if (aud?.match(/^https?:/)) {
        return aud;
      }
    }

    return null;
  } catch (e) {
    return null;
  }
}
