import { AbstractPowerSyncDatabase, PowerSyncBackendConnector } from '@powersync/web';
import { connect } from './ConnectionManager';

export interface Credentials {
  token: string;
  endpoint: string;
}

export class TokenConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const value = localStorage.getItem('powersync_credentials');
    if (value == null) {
      return null;
    }
    return JSON.parse(value);
  }

  async uploadData(database: AbstractPowerSyncDatabase) {
    // Discard any data
    const tx = await database.getNextCrudTransaction();
    await tx?.complete();
  }

  async signIn(credentials: Credentials) {
    validateSecureContext(credentials.endpoint);
    try {
      localStorage.setItem('powersync_credentials', JSON.stringify(credentials));
      await connect();
    } catch (e) {
      this.clearCredentials();
      throw e;
    }
  }

  hasCredentials() {
    return localStorage.getItem('powersync_credentials') != null;
  }

  clearCredentials() {
    localStorage.removeItem('powersync_credentials');
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
