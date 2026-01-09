import {
  AbstractPowerSyncDatabase,
  BaseObserver,
  LogLevel,
  PowerSyncBackendConnector,
  type PowerSyncCredentials,
  PowerSyncDatabase,
  createBaseLogger,
  CrudEntry,
  UpdateType,
  SyncClientImplementation,
} from "@powersync/web";
import { client } from "@/lib/auth";
import {
  wrapPowerSyncWithDrizzle,
  DrizzleAppSchema,
} from "@powersync/drizzle-driver";

import { drizzleSchema } from "./powersync-schema";

/// Postgres Response codes that we cannot recover from by retrying.
const FATAL_RESPONSE_CODES = [
  // Class 22 — Data Exception
  // Examples include data type mismatch.
  new RegExp("^22...$"),
  // Class 23 — Integrity Constraint Violation.
  // Examples include NOT NULL, FOREIGN KEY and UNIQUE violations.
  new RegExp("^23...$"),
  // INSUFFICIENT PRIVILEGE - typically a row-level security violation
  new RegExp("^42501$"),
];

export const powersyncLogger = createBaseLogger();
powersyncLogger.useDefaults();
powersyncLogger.setLevel(LogLevel.DEBUG);

// Type for the session returned by client.auth.getSession()
export type NeonSession = {
  user: { id: string; name: string; email: string };
  session: { token: string };
};

export type NeonConnectorListener = {
  initialized: () => void;
  sessionStarted: (session: NeonSession) => void;
};

const SESSION_STORAGE_KEY = "neon_session";

export class NeonConnector
  extends BaseObserver<NeonConnectorListener>
  implements PowerSyncBackendConnector
{
  ready: boolean = false;
  currentSession: NeonSession | null = null;

  constructor() {
    super();
    // Load cached session from localStorage on construction
    this.loadCachedSession();
  }

  private loadCachedSession() {
    try {
      const cached = localStorage.getItem(SESSION_STORAGE_KEY);
      if (cached) {
        this.currentSession = JSON.parse(cached);
      }
    } catch (error) {
      console.debug("Could not load cached session:", error);
    }
  }

  private persistSession(session: NeonSession | null) {
    try {
      if (session) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch (error) {
      console.debug("Could not persist session:", error);
    }
  }

  async init() {
    if (this.ready) return;

    try {
      const sessionResponse = await client.auth.getSession();
      this.updateSession(sessionResponse.data ?? null);
    } catch (error) {
      console.debug(
        "Could not fetch session during init (most likely offline), using cached session:",
        error,
      );
    }

    this.ready = true;
    this.iterateListeners((cb) => cb.initialized?.());
  }

  updateSession(session: NeonSession | null) {
    this.currentSession = session;
    this.persistSession(session);
    if (session) {
      this.iterateListeners((cb) => cb.sessionStarted?.(session));
    }
  }

  async fetchCredentials() {
    // Refresh session to get a fresh token (handles token expiry)
    try {
      const sessionResponse = await client.auth.getSession();
      if (sessionResponse.data) {
        this.currentSession = sessionResponse.data;
        this.persistSession(sessionResponse.data);
      }
    } catch (error) {
      // Network error - use cached session if available (offline mode)
      console.debug(
        "Could not refresh session (most likely offline), using cached:",
        error,
      );
    }

    if (!this.currentSession) {
      throw new Error("Could not fetch Neon credentials.");
    }

    return {
      endpoint: import.meta.env.VITE_POWERSYNC_URL,
      token: this.currentSession.session.token ?? "",
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
        const table = client.from(op.table as any);
        let result: any;
        switch (op.op) {
          case UpdateType.PUT:
            const record = { ...(op.opData as any), id: op.id };
            result = await table.upsert(record as any);
            break;
          case UpdateType.PATCH:
            result = await table.update(op.opData as any).eq("id", op.id);
            break;
          case UpdateType.DELETE:
            result = await table.delete().eq("id", op.id);
            break;
        }

        if (result.error) {
          console.error(result.error);
          result.error.message = `Could not update Neon. Received error: ${result.error.message}`;
          throw result.error;
        }
      }

      await transaction.complete();
    } catch (ex: any) {
      console.debug(ex);
      if (
        typeof ex.code == "string" &&
        FATAL_RESPONSE_CODES.some((regex) => regex.test(ex.code))
      ) {
        /**
         * Instead of blocking the queue with these errors,
         * discard the (rest of the) transaction.
         *
         * Note that these errors typically indicate a bug in the application.
         * If protecting against data loss is important, save the failing records
         * elsewhere instead of discarding, and/or notify the user.
         */
        console.error("Data upload error - discarding:", lastOp, ex);
        await transaction.complete();
      } else {
        // Error may be retryable - e.g. network error or temporary server error.
        // Throwing an error here causes this call to be retried after a delay.
        throw ex;
      }
    }
  }
}

export const neonConnector = new NeonConnector();

export const AppSchema = new DrizzleAppSchema(drizzleSchema);

export const powersync = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: "powersync.db",
  },
});

export const powersyncDrizzle = wrapPowerSyncWithDrizzle(powersync);

let isInitialized = false;

export async function connectPowerSync() {
  if (isInitialized) {
    return;
  }
  await powersync.connect(neonConnector, {
    clientImplementation: SyncClientImplementation.RUST,
  });
  isInitialized = true;
  console.log("powersync connected");
}

export async function disconnectPowerSync() {
  await powersync.disconnect();
  isInitialized = false;
}
