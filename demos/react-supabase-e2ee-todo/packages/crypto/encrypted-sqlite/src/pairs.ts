import { Schema } from "@powersync/web";
import type { AbstractPowerSyncDatabase } from "@powersync/web";
import type { EncryptedPairConfig, MirrorColumnDef } from "./types.js";

function columnDDL(col: MirrorColumnDef): string {
  return [
    col.name,
    col.type,
    col.notNull ? "NOT NULL" : "",
    col.defaultExpr ? `DEFAULT ${col.defaultExpr}` : ""
  ].filter(Boolean).join(" ");
}

/** Install raw-table mappings (PowerSync stays blind to your domain) */
export function installPairsOnSchema(base: Schema, pairs: EncryptedPairConfig[]) {
  const mappings: Record<string, any> = {};
  for (const p of pairs) {
    mappings[p.encryptedTable] = {
      put: {
        sql: `
          INSERT INTO ${p.encryptedTable} (
            id, user_id, bucket_id,
            alg, aad, nonce_b64, cipher_b64, kdf_salt_b64,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            user_id=excluded.user_id,
            bucket_id=excluded.bucket_id,
            alg=excluded.alg,
            aad=excluded.aad,
            nonce_b64=excluded.nonce_b64,
            cipher_b64=excluded.cipher_b64,
            kdf_salt_b64=excluded.kdf_salt_b64,
            created_at=excluded.created_at,
            updated_at=excluded.updated_at
        `.trim(),
        params: [
          "Id",
          { Column: "user_id" },
          { Column: "bucket_id" },
          { Column: "alg" },
          { Column: "aad" },
          { Column: "nonce_b64" },
          { Column: "cipher_b64" },
          { Column: "kdf_salt_b64" },
          { Column: "created_at" },
          { Column: "updated_at" }
        ]
      },
      delete: {
        sql: `DELETE FROM ${p.encryptedTable} WHERE id = ?`,
        params: ["Id"]
      }
    };
  }
  return base.withRawTables(mappings);
}

/** Create encrypted & mirror tables and upload triggers */
export async function ensurePairsDDL(db: AbstractPowerSyncDatabase, pairs: EncryptedPairConfig[]) {
  for (const p of pairs) {
    const enc = p.encryptedTable;
    const mir = p.mirrorTable;

    // Encrypted table (opaque)
    await db.execute(
      `
      CREATE TABLE IF NOT EXISTS ${enc} (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        bucket_id TEXT,
        alg TEXT NOT NULL,
        aad TEXT,
        nonce_b64 TEXT NOT NULL,
        cipher_b64 TEXT NOT NULL,
        kdf_salt_b64 TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_${enc}_user_updated ON ${enc}(user_id, updated_at DESC);
      `
    );

    // Mirror table with custom columns
    const customColsDDL = p.mirrorColumns.map(columnDDL).join(",\n        ");
    await db.execute(
      `
      CREATE TABLE IF NOT EXISTS ${mir} (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        bucket_id TEXT,
        updated_at TEXT NOT NULL,
        ${customColsDDL}
      );
      CREATE INDEX IF NOT EXISTS idx_${mir}_user_updated ON ${mir}(user_id, updated_at DESC);
      `
    );
    if (p.mirrorExtraIndexes?.length) {
      for (const idx of p.mirrorExtraIndexes) {
        await db.execute(idx);
      }
    }

    // CRUD triggers to enqueue uploads
    await db.execute(
      `
      CREATE TRIGGER IF NOT EXISTS ${enc}_insert AFTER INSERT ON ${enc}
      BEGIN
        INSERT INTO powersync_crud (op, id, type, data)
        VALUES ('PUT', NEW.id, '${enc}', json_object(
          'user_id', NEW.user_id,
          'bucket_id', NEW.bucket_id,
          'alg', NEW.alg,
          'aad', NEW.aad,
          'nonce_b64', NEW.nonce_b64,
          'cipher_b64', NEW.cipher_b64,
          'kdf_salt_b64', NEW.kdf_salt_b64,
          'created_at', NEW.created_at,
          'updated_at', NEW.updated_at
        ));
      END;

      CREATE TRIGGER IF NOT EXISTS ${enc}_update AFTER UPDATE ON ${enc}
      BEGIN
        INSERT INTO powersync_crud (op, id, type, data)
        VALUES ('PATCH', NEW.id, '${enc}', json_object(
          'user_id', NEW.user_id,
          'bucket_id', NEW.bucket_id,
          'alg', NEW.alg,
          'aad', NEW.aad,
          'nonce_b64', NEW.nonce_b64,
          'cipher_b64', NEW.cipher_b64,
          'kdf_salt_b64', NEW.kdf_salt_b64,
          'created_at', NEW.created_at,
          'updated_at', NEW.updated_at
        ));
      END;

      CREATE TRIGGER IF NOT EXISTS ${enc}_delete AFTER DELETE ON ${enc}
      BEGIN
        INSERT INTO powersync_crud (op, id, type)
        VALUES ('DELETE', OLD.id, '${enc}');
      END;

      CREATE TRIGGER IF NOT EXISTS ${enc}_mirror_cascade_delete
      AFTER DELETE ON ${enc}
      BEGIN
        DELETE FROM ${mir} WHERE id = OLD.id;
      END;
      `
    );
  }
}