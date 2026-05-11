import { AbstractPowerSyncDatabase, PowerSyncBackendConnector, UpdateType } from '@powersync/web';
import { ConvexReactClient } from 'convex/react';
import { makeFunctionReference } from 'convex/server';
import { ConvexError } from 'convex/values';
import type { ConvexMutationErrorData } from '../../../convex/mutationErrors';
import { UPLOAD_REJECTION_MUTATION_ERROR_CODES } from '../../../convex/mutationErrors';
import ConvexSchema from '../../../convex/schema';
import { createConvexDecoder } from './ConvexDecoder';

const convexDecoders = {
  lists: {
    create: createConvexDecoder(ConvexSchema.tables.lists.validator),
    patch: createConvexDecoder(ConvexSchema.tables.lists.validator.partial())
  },
  todos: {
    create: createConvexDecoder(ConvexSchema.tables.todos.validator.omit('list_id'), {}),
    patch: createConvexDecoder(ConvexSchema.tables.todos.validator.partial(), {})
  }
} as const;

function decodeCrudData(table: string, mode: 'create' | 'patch', data: Record<string, unknown>) {
  if (table !== 'lists' && table !== 'todos') {
    throw new Error(`No Convex decoder configured for table "${table}".`);
  }

  return convexDecoders[table][mode](data as never);
}

function getConvexErrorData(error: unknown): ConvexMutationErrorData | undefined {
  if (error instanceof ConvexError) {
    return error.data as ConvexMutationErrorData;
  }

  const data = (error as { data?: unknown } | undefined)?.data;
  if (data && typeof data === 'object') {
    return data as ConvexMutationErrorData;
  }
}

function isPermanentConvexRejection(error: unknown) {
  const code = getConvexErrorData(error)?.code;
  return typeof code === 'string' && UPLOAD_REJECTION_MUTATION_ERROR_CODES.has(code);
}

/**
 * Runtime dependencies injected by the React app when constructing the
 * PowerSync connector.
 */
export type ConnectorOptions = {
  convexClient: ConvexReactClient;
};

/**
 * Bridges PowerSync to Convex.
 *
 * The connector supplies PowerSync credentials from the active Convex Auth
 * session, uploads queued local writes by calling Convex mutations, and drops
 * transactions only when Convex returns one of the configured upload rejection
 * error codes.
 */
export class DemoConnector implements PowerSyncBackendConnector {
  readonly powersyncUrl: string;
  private convexClient: ConvexReactClient;
  private authToken: string | null;

  constructor(options: ConnectorOptions) {
    this.authToken = null;
    this.convexClient = options.convexClient;
    this.powersyncUrl = import.meta.env.VITE_POWERSYNC_URL ?? 'http://localhost:8080';
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
            const putData = decodeCrudData(table, 'create', op.opData ?? {});
            await this.convexClient.mutation(createRef, { ...putData, uuid: op.id });
            break;
          }
          case UpdateType.PATCH: {
            const updateRef = makeFunctionReference<'mutation'>(`${table}:update`);
            const patchData = decodeCrudData(table, 'patch', op.opData ?? {});
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
    } catch (ex: unknown) {
      if (isPermanentConvexRejection(ex)) {
        console.warn('[PowerSync] Rejecting upload transaction after permanent Convex mutation error', {
          error: getConvexErrorData(ex)
        });
        await transaction.complete();
        return;
      }

      throw ex;
    }
  }
}
