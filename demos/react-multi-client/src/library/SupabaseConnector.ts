import {
  AbstractPowerSyncDatabase,
  BaseListener,
  BaseObserver,
  CrudEntry,
  PowerSyncBackendConnector,
  UpdateType
} from '@powersync/web';

import { Session, SupabaseClient } from '@supabase/supabase-js';
import { isFatalPostgresResponseCode } from './Postgres';

export interface SupabaseConnectorListener extends BaseListener {
  onCRUDEvent: (event: { crudType: UpdateType; elapsedTimeMs: number }) => void;
}

import { Mutex } from 'async-mutex';

export class SupabaseConnector extends BaseObserver<SupabaseConnectorListener> implements PowerSyncBackendConnector {
  static SHARED_MUTEX = new Mutex();
  readonly client: SupabaseClient;

  ready: boolean;

  currentSession: Session | null;

  constructor(client: SupabaseClient) {
    super();
    this.client = client;
    this.currentSession = null;
    this.ready = false;
  }

  async init() {
    if (this.ready) {
      return;
    }

    // Ensures that we don't accidentally check/create multiple anon sessions during initialization
    const release = await SupabaseConnector.SHARED_MUTEX.acquire();

    let sessionResponse = await this.client.auth.getSession();
    if (sessionResponse.error) {
      console.error(sessionResponse.error);
      throw sessionResponse.error;
    } else if (!sessionResponse.data.session) {
      const anonUser = await this.client.auth.signInAnonymously();
      if (anonUser.error) {
        throw anonUser.error;
      }
      sessionResponse = await this.client.auth.getSession();
    }

    this.updateSession(sessionResponse.data.session);

    this.ready = true;
    this.iterateListeners((cb) => cb.initialized?.());

    release();
  }

  async fetchCredentials() {
    const authRes = await this.client.auth.getSession();

    if (authRes.error || !authRes.data || !authRes.data.session) {
      throw new Error(`Failed to get PowerSync Token, code=${authRes.error}`);
    }

    const { access_token: token, expires_at } = authRes.data.session;

    return {
      token: token,
      endpoint: import.meta.env.VITE_POWERSYNC_URL
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
      for (let op of transaction.crud) {
        lastOp = op;
        const table = this.client.from(op.table);
        let result: any;
        switch (op.op) {
          case UpdateType.PUT:
            const record = { ...op.opData, id: op.id };
            result = await table.upsert(record);
            break;
          case UpdateType.PATCH:
            result = await table.update(op.opData).eq('id', op.id);
            break;
          case UpdateType.DELETE:
            result = await table.delete().eq('id', op.id);
            break;
        }

        if (result.error) {
          console.error(result.error);
          result.error.message = `Could not update Supabase. Received error: ${result.error.message}`;
          throw result.error;
        }
      }

      await transaction.complete();
    } catch (ex: any) {
      console.debug(ex);
      if (typeof ex.code == 'string' && isFatalPostgresResponseCode(ex.code)) {
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

  updateSession(session: Session | null) {
    this.currentSession = session;
    if (!session) {
      return;
    }

    this.iterateListeners((cb) => cb.sessionStarted?.(session));
  }
}
