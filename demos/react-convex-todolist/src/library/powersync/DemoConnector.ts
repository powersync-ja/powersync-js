import { AbstractPowerSyncDatabase, PowerSyncBackendConnector, UpdateType } from '@powersync/web';
import { ConvexReactClient } from 'convex/react';
import { makeFunctionReference } from 'convex/server';

/**
 * Fields stored as integer in SQLite that should be boolean in Convex, keyed by table name.
 */
const BOOLEAN_FIELDS: Record<string, string[]> = {
  lists: ['archived']
};

/**
 * Fields stored as JSON text in SQLite that should be parsed before sending to Convex.
 */
const JSON_FIELDS: Record<string, string[]> = {
  lists: ['tags']
};

/**
 * Coerce SQLite values to the types Convex expects.
 * - integer 0/1 → boolean for boolean fields
 * - JSON strings → parsed arrays/objects for JSON fields
 */
function coerceOpData(table: string, data: Record<string, any>): Record<string, any> {
  const result = { ...data };
  for (const field of BOOLEAN_FIELDS[table] ?? []) {
    if (field in result && typeof result[field] === 'number') {
      result[field] = !!result[field];
    }
  }
  for (const field of JSON_FIELDS[table] ?? []) {
    if (field in result && typeof result[field] === 'string') {
      try {
        result[field] = JSON.parse(result[field]);
      } catch {
        // leave as-is if not valid JSON
      }
    }
  }
  return result;
}

export type ConnectorOptions = {
  convexClient: ConvexReactClient;
};

export class DemoConnector implements PowerSyncBackendConnector {
  readonly powersyncUrl: string;
  private convexClient: ConvexReactClient;
  private authToken: string | null;

  constructor(options: ConnectorOptions) {
    this.authToken = null;
    this.convexClient = options.convexClient;
    this.powersyncUrl = import.meta.env.VITE_POWERSYNC_URL;
  }

  /**
   * Updates the cached token.
   * This is called from the React component when the Convex auth token
   * is reactively updated.
   */
  setAuthToken(token: string | null) {
    this.authToken = token;
  }
  /**
   * Fetches a JWT from Convex Auth for PowerSync authentication.
   * Uses the Convex Auth session token.
   */
  async fetchCredentials() {
    if (!this.authToken) {
      throw new Error('Not authenticated with Convex');
    }

    console.log('[PowerSync] Using Convex Auth token');

    return {
      endpoint: this.powersyncUrl,
      token: this.authToken
    };
  }

  /**
   * Uploads pending CRUD operations to Convex by calling mutations directly.
   */
  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();

    if (!transaction) {
      return;
    }

    try {
      for (const op of transaction.crud) {
        const table = op.table;

        switch (op.op) {
          case UpdateType.PUT: {
            const createRef = makeFunctionReference<'mutation'>(`${table}:create`);
            const putData = coerceOpData(table, op.opData ?? {});
            await this.convexClient.mutation(createRef, { ...putData, uuid: op.id });
            break;
          }
          case UpdateType.PATCH: {
            const updateRef = makeFunctionReference<'mutation'>(`${table}:update`);
            const patchData = coerceOpData(table, op.opData ?? {});
            await this.convexClient.mutation(updateRef, { ...patchData, uuid: op.id });
            break;
          }
          case UpdateType.DELETE: {
            const removeRef = makeFunctionReference<'mutation'>(`${table}:remove`);
            await this.convexClient.mutation(removeRef, { uuid: op.id });
            break;
          }
        }
      }

      await transaction.complete();
    } catch (ex: any) {
      // TODO, handle errors properly
      console.debug(ex);
      throw ex;
    }
  }
}
