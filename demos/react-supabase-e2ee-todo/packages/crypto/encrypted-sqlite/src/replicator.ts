import type { EncryptedPairConfig, EncryptedRuntime, RawEncryptedRow } from "./types.js";
import { columnsToEnvelope } from "./types.js";

/** Helper: dynamic UPSERT for mirror with declared custom columns */
function buildMirrorUpsertSQL(pair: EncryptedPairConfig) {
  const mir = pair.mirrorTable;
  const custom = pair.mirrorColumns.map(c => c.name);
  const cols = ["id", "user_id", "bucket_id", "updated_at", ...custom];
  const placeholders = cols.map(() => "?").join(", ");

  const updates = [
    "user_id=excluded.user_id",
    "bucket_id=excluded.bucket_id",
    "updated_at=excluded.updated_at",
    ...custom.map(n => `${n}=excluded.${n}`)
  ].join(", ");

  const sql = `
    INSERT INTO ${mir} (${cols.join(", ")})
    VALUES (${placeholders})
    ON CONFLICT(id) DO UPDATE SET ${updates}
  `.trim();

  return { sql, cols };
}

/** Start watchers that keep plaintext mirrors updated from encrypted tables */
export function startEncryptedMirrors(
  runtime: EncryptedRuntime,
  pairs: EncryptedPairConfig[],
  opts?: { throttleMs?: number }
) {
  const { db, userId, crypto } = runtime;
  const subs: Array<{ close: () => void }> = [];

  for (const p of pairs) {
    const enc = p.encryptedTable;
    const mir = p.mirrorTable;
    const throttle = opts?.throttleMs ?? 150;
    const upsert = buildMirrorUpsertSQL(p);

    const q = db.query<RawEncryptedRow>({
      sql: `
        SELECT id, user_id, bucket_id, alg, aad, nonce_b64, cipher_b64, kdf_salt_b64, updated_at
          FROM ${enc}
         WHERE user_id = ?
         ORDER BY updated_at DESC
      `,
      parameters: [userId]
    });
    const sub = q.differentialWatch({
        throttleMs: throttle,
        rowComparator: {
          keyBy: (r) => String(r.id),
          compareBy: (r) =>
            `${r.alg}|${r.aad ?? ""}|${r.nonce_b64}|${r.cipher_b64}|${r.kdf_salt_b64}|${r.updated_at}`
        }
    }).registerListener({
         onDiff: async ({ added, updated, removed }) => {
        if ((!added || added.length === 0) && (!updated || updated.length === 0) && (!removed || removed.length === 0)) {
          return;
        }

        await db.writeTransaction(async (tx) => {
          const normalizeUpdated = (updated ?? []).map((u: any) => (u && "current" in u ? u.current : u));
          const work = [...(added ?? []), ...normalizeUpdated];

          // Upsert mirror for added/updated
          for (const r of work) {
            try {
              const env = columnsToEnvelope(r);
              const plain = await crypto.decrypt(env, r.aad ?? undefined);
              const parsed = p.parsePlain({
                plaintext: plain,
                aad: r.aad ?? undefined,
                encryptedRow: {
                  id: r.id,
                  user_id: r.user_id,
                  bucket_id: r.bucket_id ?? null,
                  updated_at: r.updated_at,
                  alg: r.alg
                }
              });

              // Build param array in declared column order
              const base = [r.id, r.user_id, r.bucket_id ?? null, r.updated_at];
              const customVals = p.mirrorColumns.map(col => parsed[col.name] ?? null);
              await tx.execute(upsert.sql, [...base, ...customVals]);
            } catch (e) {
              // If key locked or parse fails, skip row
              // eslint-disable-next-line no-console
              console.warn(`[mirror ${enc}→${mir}] decrypt/parse failed id=${r.id}`, e);
            }
          }

          // Remove from mirror
          for (const r of removed ?? []) {
            await tx.execute(`DELETE FROM ${mir} WHERE id = ?`, [r.id]);
          }
        });
      },
      onError: (err: any) => {
        // eslint-disable-next-line no-console
        console.error(`[mirror ${enc}→${mir}] watch error:`, err);
      }
    } );
    subs.push({close: sub});
  }

  return () => {
    for (const s of subs) {
      try { s.close(); } catch {}
    }
  };
}