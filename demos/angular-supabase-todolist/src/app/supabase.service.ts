import { Injectable } from '@angular/core';
import {
  type AuthChangeEvent,
  type AuthSession,
  createClient,
  type Session,
  type SupabaseClient,
  type User
} from '@supabase/supabase-js';
import { environment } from '../environment';
import { type AbstractPowerSyncDatabase, type CrudEntry, UpdateType, PowerSyncBackendConnector, type PowerSyncCredentials } from '@powersync/web';

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

@Injectable({
  providedIn: 'root'
})
export class SupabaseService implements PowerSyncBackendConnector {
  private supabase: SupabaseClient;
  _session: AuthSession | null = null;
  _userId: string | null = null;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey, {
      auth: {
        persistSession: true
      }
    });
  }

  setUserId(userId: string) {
    this._userId = userId;
  }

  async getSession() {
    const { data } = await this.supabase.auth.getSession();
    if (data.session?.user.id) {
      this.setUserId(data.session.user.id);
    }
    return data.session;
  }

  setSession(session: AuthSession | null) {
    this._session = session;
  }

  async fetchCredentials() {
    const {
      data: { session },
      error
    } = await this.supabase.auth.getSession();

    if (!session || error) {
      throw new Error(`Could not fetch Supabase credentials: ${error}`);
    }

    return {
      endpoint: environment.powersyncUrl,
      token: session.access_token ?? '',
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined
    } satisfies PowerSyncCredentials;
  }

  authChanges(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return this.supabase.auth.onAuthStateChange(callback);
  }

  async signIn(email: string, password: string) {
    const result = await this.supabase.auth.signInWithPassword({ email, password });
    if (result.data.session) {
      this.setSession(result.data.session);
    }

    return !!result.data.session?.access_token;
  }

  async signUp(email: string, password: string): Promise<User | null> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      throw error;
    }

    return data.user;
  }

  async signOut() {
    await this.supabase.auth.signOut();
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
        const table = this.supabase.from(op.table);
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
}
