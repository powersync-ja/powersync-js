import { AbstractPowerSyncDatabase, CrudEntry, PowerSyncBackendConnector, UpdateType } from '@powersync/react-native';

import { AppConfig } from './AppConfig';
import { ApiClient } from './ApiClient';
import { Storage } from './Storage';

/// Postgres Response codes that we cannot recover from by retrying.
const FATAL_RESPONSE_CODES = [
  // Class 22 — Data Exception
  // Examples include data type mismatch.
  new RegExp('^22...$'),
  // Class 23 — Integrity Constraint Violation.
  // Examples include NOT NULL, FOREIGN KEY and UNIQUE violations.
  new RegExp('^23...$'),
  // INSUFFICIENT PRIVILEGE - typically a row-level security violation
  new RegExp('^42501$')
];

export class DjangoConnector implements PowerSyncBackendConnector {
  private apiClient: ApiClient;

  constructor() {
    this.apiClient = new ApiClient(AppConfig.djangoUrl);
  }

  async login(username: string, password: string) {
    const data = await this.apiClient.authenticate(username, password);
    if (data) {
      const payload = this.parseJwt(data.access_token);
      await Storage.setItem('id', payload.sub.toString());
    }
  }

  async register(username: string, password: string) {
    return this.apiClient.register(username, password);
  }

  async userId() {
    return Storage.getItem('id');
  }

  async fetchCredentials() {
    // The demo does not invalidate or update a user token, you should implement this in your app
    // The app stores the user id in local storage
    const userId = await Storage.getItem('id');
    if (!userId) {
      throw new Error('User does not have session');
    }
    const session = await this.apiClient.getToken(userId);
    return {
      endpoint: AppConfig.powersyncUrl,
      token: session.token ?? ''
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();

    if (!transaction) {
      return;
    }

    let lastOp: CrudEntry | null = null;
    try {
      // Note: If transactional consistency is important, use database functions
      // or edge functions to process the entire transaction in a single call.
      for (const op of transaction.crud) {
        lastOp = op;
        const record = { table: op.table, data: { ...op.opData, id: op.id } };
        switch (op.op) {
          case UpdateType.PUT:
            await this.apiClient.upsert(record);
            break;
          case UpdateType.PATCH:
            await this.apiClient.update(record);
            break;
          case UpdateType.DELETE:
            await this.apiClient.delete(record);
            break;
        }
      }

      await transaction.complete();
    } catch (ex: any) {
      console.debug(ex);
      if (typeof ex.code == 'string' && FATAL_RESPONSE_CODES.some((regex) => regex.test(ex.code))) {
        /**
         * Instead of blocking the queue with these errors,
         * discard the (rest of the) transaction.
         *
         * Note that these errors typically indicate a bug in the application.
         * If protecting against data loss is important, save the failing records
         * elsewhere instead of discarding, and/or notify the user.
         */
        console.error('Data upload error - discarding:', lastOp, ex);
        await transaction.complete();
      } else {
        // Error may be retryable - e.g. network error or temporary server error.
        // Throwing an error here causes this call to be retried after a delay.
        throw ex;
      }
    }
  }

  private parseJwt(token: string) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );

    return JSON.parse(jsonPayload);
  }
}
