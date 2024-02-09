import {
  AbstractPowerSyncDatabase,
  BaseObserver,
  CrudEntry,
  PowerSyncBackendConnector,
  UpdateType
} from '@journeyapps/powersync-sdk-web';

import {
  SupabaseClient,
  createClient,
  PostgrestError,
  FunctionsHttpError,
  FunctionsRelayError,
  FunctionsFetchError
} from '@supabase/supabase-js';

export type SupabaseConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  powersyncUrl: string;
};

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

export type SupabaseConnectorListener = {
  initialized: () => void;
};

export class SupabaseConnector extends BaseObserver<SupabaseConnectorListener> implements PowerSyncBackendConnector {
  private _client: SupabaseClient | null;
  private _config: SupabaseConfig | null;

  ready: boolean;

  constructor() {
    super();
    this._client = null;
    this._config = null;
    this.ready = false;
  }

  get client(): SupabaseClient {
    if (!this._client) {
      throw new Error('Supabase client has not been initialized yet');
    }
    return this._client;
  }

  get config(): SupabaseConfig {
    if (!this._config) {
      throw new Error('Supabase client has not been initialized yet');
    }
    return this._config;
  }

  async init() {
    if (this.ready) {
      return;
    }
    const credentialsResponse = await fetch('/api/supabase');
    this._config = await credentialsResponse.json();
    this._client = createClient(this.config.supabaseUrl, this.config.supabaseAnonKey);
    this.ready = true;
    this.iterateListeners((cb) => cb.initialized?.());
  }

  async fetchCredentials() {
    const { data, error } = await this.client.functions.invoke('powersync-auth-anonymous', {
      method: 'GET'
    });

    if (error instanceof FunctionsHttpError) {
      const errorMessage = await error.context.json();
      console.log('Supabase edge function returned an error', errorMessage);
    } else if (error instanceof FunctionsRelayError) {
      console.log('Supabase edge function: Relay error:', error.message);
    } else if (error instanceof FunctionsFetchError) {
      console.log('Supabase edge function: Fetch error:', error.message);
    }

    return {
      client: this.client,
      endpoint: data.powersync_url,
      token: data.token,
      expiresAt: undefined
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const batch = await database.getCrudBatch(200);

    if (!batch) {
      return;
    }

    let updateBatch: any[] = [];

    let lastOp: CrudEntry | null = null;
    try {
      // Note: If transactional consistency is important, use database functions
      // or edge functions to process the entire transaction in a single call.
      for (let op of batch.crud) {
        lastOp = op;
        const table = this.client.from(op.table);
        let result: any;
        let record: any;
        if (op.op == UpdateType.PUT || op.op == UpdateType.PATCH) {
          record = { ...op.opData };
        }

        if (op.op == UpdateType.PUT && op.table == 'document_updates') {
          updateBatch.push({
            ...record,
            id: op.id
          });
          continue;
        }

        switch (op.op) {
          case UpdateType.PUT:
            record.id = op.id;
            result = await table.upsert(record);
            break;
          case UpdateType.PATCH:
            result = await table.update(record).eq('id', op.id);
            break;
          case UpdateType.DELETE:
            result = await table.delete().eq('id', op.id);
            break;
        }

        if (result.error) {
          console.error(result.error);
          throw new Error(`Could not update Supabase. Received error: ${result.error.message}`);
        }
      }

      if (updateBatch.length > 0) {
        console.log('inserting batch of size', updateBatch.length);
        const result = await this.client.rpc('insert_document_updates', { batch: JSON.stringify(updateBatch) });
        if (result.error) {
          throw new Error(`Could not update Supabase. Received error: ${result.error.message}`);
        }
      }

      await batch.complete();
    } catch (ex: any) {
      console.debug(ex);
      if (typeof ex.code == 'string' && FATAL_RESPONSE_CODES.some((regex) => regex.test(ex.code))) {
        /**
         * Instead of blocking the queue with these errors, discard the (rest of the) transaction.
         *
         * Note that these errors typically indicate a bug in the application.
         * If protecting against data loss is important, save the failing records
         * elsewhere instead of discarding, and/or notify the user.
         */
        console.error(`Data upload error - discarding ${lastOp}`, ex);
        await batch.complete();
      } else {
        // Error may be retryable - e.g. network error or temporary server error.
        // Throwing an error here causes this call to be retried after a delay.
        throw ex;
      }
    }
  }
}
