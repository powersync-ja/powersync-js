import React, { useEffect, useMemo } from "react";
import { PowerSyncContext } from "@powersync/react";
import {
  PowerSyncDatabase,
  BaseObserver,
  type PowerSyncBackendConnector,
  type PowerSyncCredentials,
  AbstractPowerSyncDatabase,
  Schema,
  Table,
  column,
  CrudEntry,
  UpdateType,
} from "@powersync/web";
import { getAccessToken, getSupabase } from "../lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

// NEW: bring in our pair + DDL installer
import { ensurePairsDDL } from "@crypto/sqlite";
import { TODOS_PAIR } from "../encrypted/todosPair";

class TokenConnector
  extends BaseObserver<{}>
  implements PowerSyncBackendConnector
{
  private client: SupabaseClient | null;
  constructor(private endpoint: string) {
    super();
    this.client = getSupabase();
  }
  async fetchCredentials(): Promise<PowerSyncCredentials> {
    const token = await getAccessToken();
    if (!token) throw new Error("Not authenticated");
    return { endpoint: this.endpoint, token };
  }
  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    while (true) {
      const tx = await database.getNextCrudTransaction();
      if (!tx) break;
      let lastOp: CrudEntry | null = null;
      try {
        if (!this.client) {
          // No upstream client configured; drain and complete
          await tx.complete();
          continue;
        }
        for (const op of tx.crud) {
          console.log({ op });
          lastOp = op;
          const table = this.client.from(op.table);
          let result: any;
          switch (op.op) {
            case UpdateType.PUT: {
              const record = { ...op.opData, id: op.id };
              result = await table.upsert(record);
              break;
            }
            case UpdateType.PATCH: {
              result = await table.update(op.opData).eq("id", op.id);
              break;
            }
            case UpdateType.DELETE: {
              result = await table.delete().eq("id", op.id);
              break;
            }
          }
          if (result?.error) {
            throw new Error(result.error.message || "Supabase error");
          }
        }
        await tx.complete();
      } catch (err: any) {
        // No explicit fail() in this SDK version; log and rethrow for retry
        console.error("uploadData error:", err, "last op:", lastOp);
        throw err;
      }
    }
  }
}

export function SystemProvider({ children }: { children: React.ReactNode }) {
  const endpoint = import.meta.env.VITE_POWERSYNC_URL;
  console.debug("VITE_POWERSYNC_URL =", import.meta.env.VITE_POWERSYNC_URL);
  const db = useMemo(() => {
    // Keep PowerSync schema minimal: NO domain model columns for todos here.
    const e2ee_keys = new Table({
      id: column.text,
      user_id: column.text,
      provider: column.text,
      alg: column.text,
      aad: column.text,
      nonce_b64: column.text,
      cipher_b64: column.text,
      kdf_salt_b64: column.text,
      created_at: column.text,
    });
    const schema = new Schema({ e2ee_keys });
    const powerSync = new PowerSyncDatabase({
      database: { dbFilename: "e2ee-todo-v3.db" },
      schema,
      flags: { disableSSRWarning: true },
    });
    return powerSync;
  }, []);

  useEffect(() => {
    if (!endpoint) return;
    const connector = new TokenConnector(endpoint);
    (async () => {
      try {
        await db.init();

        // IMPORTANT: Create encrypted raw ("todos") + local mirror ("todos_plain")
        await ensurePairsDDL(db, [TODOS_PAIR]);

        await db.connect(connector);
        await db.waitForReady();
      } catch (err: any) {
        const msg = err?.message ?? String(err ?? "");
        // Handle local schema/view mismatches gracefully by clearing local DB once
        if (
          msg.includes("powersync_replace_schema") ||
          msg.includes("powersync_drop_view")
        ) {
          console.warn(
            "PowerSync local schema mismatch. Clearing and retrying…",
          );
          try {
            await db.disconnectAndClear({ clearLocal: true });
          } catch {}
          try {
            await db.init();
            await ensurePairsDDL(db, [TODOS_PAIR]);
            await db.connect(connector);
            await db.waitForReady();
          } catch (e2) {
            console.error("PowerSync init/connect failed after reset:", e2);
          }
        } else {
          console.error("PowerSync init/connect failed:", err);
        }
      }
    })();
  }, [db, endpoint]);

  return (
    <PowerSyncContext.Provider value={db}>{children}</PowerSyncContext.Provider>
  );
}

export default SystemProvider;
