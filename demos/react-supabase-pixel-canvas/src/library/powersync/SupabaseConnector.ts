import {
  AbstractPowerSyncDatabase,
  BaseObserver,
  CrudEntry,
  PowerSyncBackendConnector,
  UpdateType,
  type PowerSyncCredentials
} from '@powersync/web';

import { Session, SupabaseClient, createClient } from '@supabase/supabase-js';

import { getSupabaseConfig, SupabaseConfig } from './connection';

/// Postgres Response codes that we cannot recover from by retrying.
const FATAL_RESPONSE_CODES = [
  // Class 22 — Data Exception (e.g. data type mismatch).
  new RegExp('^22...$'),
  // Class 23 — Integrity Constraint Violation (NOT NULL, FK, UNIQUE).
  new RegExp('^23...$'),
  // INSUFFICIENT PRIVILEGE - typically a row-level security violation.
  new RegExp('^42501$')
];

export type SupabaseConnectorListener = {
  initialized: () => void;
  sessionStarted: (session: Session) => void;
};

export class SupabaseConnector extends BaseObserver<SupabaseConnectorListener> implements PowerSyncBackendConnector {
  readonly client: SupabaseClient;
  readonly config: SupabaseConfig;

  ready: boolean;

  currentSession: Session | null;

  constructor() {
    super();
    this.config = getSupabaseConfig();

    this.client = createClient(this.config.supabaseUrl, this.config.supabaseAnonKey, {
      auth: {
        persistSession: true
      }
    });
    this.currentSession = null;
    this.ready = false;
  }

  async init() {
    if (this.ready) {
      return;
    }

    let sessionResponse = await this.client.auth.getSession();
    if (!sessionResponse.data.session) {
      // Anonymous sign-in: every booth visitor becomes a distinct anon user.
      // Requires anonymous sign-ins to be enabled on the Supabase project.
      const anon = await this.client.auth.signInAnonymously();
      if (anon.error) {
        throw anon.error;
      }
      sessionResponse = await this.client.auth.getSession();
    }
    this.updateSession(sessionResponse.data.session);

    this.ready = true;
    this.iterateListeners((cb) => cb.initialized?.());
  }

  async fetchCredentials() {
    const {
      data: { session },
      error
    } = await this.client.auth.getSession();

    if (!session || error) {
      throw new Error(`Could not fetch Supabase credentials: ${error}`);
    }

    return {
      endpoint: this.config.powersyncUrl,
      token: session.access_token ?? ''
    } satisfies PowerSyncCredentials;
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
        const table = this.client.from(op.table);
        let result: any;
        switch (op.op) {
          case UpdateType.PUT:
            const record = { ...op.opData, id: op.id };
            result = await table.upsert(record);
            break;
          case UpdateType.PATCH:
            result = await table.update(op.opData ?? {}).eq('id', op.id);
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
      if (typeof ex.code == 'string' && FATAL_RESPONSE_CODES.some((regex) => regex.test(ex.code))) {
        // Instead of blocking the queue with these errors, discard the (rest of
        // the) transaction. These typically indicate an application bug.
        console.error('Data upload error - discarding:', lastOp, ex);
        await transaction.complete();
      } else {
        // Error may be retryable - e.g. network error. Throwing retries later.
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
