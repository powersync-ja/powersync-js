import type { CryptoProvider, CipherEnvelope } from "@crypto/interface";
import type { AbstractPowerSyncDatabase } from "@powersync/web";
import { bytesToBase64 } from "@crypto/interface";
import { generateDEK } from "@crypto/sqlite";

type ProviderKind = "password" | "webauthn";

export type WrappedKeyRow = {
  user_id: string;
  provider: ProviderKind;
  alg: string;
  aad?: string | null;
  nonce_b64: string;
  cipher_b64: string;
  kdf_salt_b64: string;
  created_at: string;
};

export async function ensureDEKWrapped(
  db: AbstractPowerSyncDatabase,
  userId: string,
  providerKind: ProviderKind,
  wrapper: CryptoProvider,
  keyId?: string,
): Promise<Uint8Array> {
  const existing = await fetchWrappedKeyLocal(db, userId, providerKind, keyId);
  if (existing) {
    try {
      const dek = await wrapper.decrypt(
        {
          header: {
            v: 1,
            alg: existing.alg,
            aad: existing.aad ?? undefined,
            kdf: { saltB64: existing.kdf_salt_b64 },
          },
          nB64: existing.nonce_b64,
          cB64: existing.cipher_b64,
        },
        existing.aad ?? undefined,
      );
      return dek;
    } catch (e) {
      // Do NOT overwrite an existing key if we cannot decrypt it with the provided credential.
      // This typically means the user entered a different passphrase or is using a different authenticator.
      // Throw so the caller can prompt the user accordingly, and to avoid data loss.
      console.error(
        "Existing wrapped key cannot be decrypted with this credential. Not overwriting.",
        e,
      );
      throw e instanceof Error ? e : new Error(String(e));
    }
  }

  // Create and wrap a new DEK
  const dek = await generateDEK();
  const aad = "dek-v1";
  const env: CipherEnvelope = await wrapper.encrypt(dek, aad);
  await upsertWrappedKeyLocal(db, userId, providerKind, env, aad, keyId);
  return dek;
}

export async function fetchWrappedKeyLocal(
  db: AbstractPowerSyncDatabase,
  userId: string,
  providerKind: ProviderKind,
  keyId?: string,
): Promise<WrappedKeyRow | null> {
  const id = keyId ?? makeKeyId(userId, providerKind);
  const rows = await db.getAll<WrappedKeyRow>(
    "SELECT * FROM e2ee_keys WHERE id = ? LIMIT 1",
    [id],
  );
  return rows?.[0] ?? null;
}

export async function upsertWrappedKeyLocal(
  db: AbstractPowerSyncDatabase,
  userId: string,
  providerKind: ProviderKind,
  env: CipherEnvelope,
  aad?: string,
  keyId?: string,
) {
  const id = keyId ?? makeKeyId(userId, providerKind);
  const row = {
    id,
    user_id: userId,
    provider: providerKind,
    alg: env.header.alg,
    aad: aad ?? env.header.aad ?? null,
    nonce_b64: env.nB64,
    cipher_b64: env.cB64,
    kdf_salt_b64: env.header.kdf.saltB64 ?? "",
    created_at: new Date().toISOString(),
  };
  // Views do not support ON CONFLICT; do existence check then UPDATE or INSERT
  const exists = await db.getAll(
    "SELECT 1 FROM e2ee_keys WHERE id = ? LIMIT 1",
    [row.id],
  );
  if (exists && exists.length > 0) {
    await db.execute(
      "UPDATE e2ee_keys SET alg = ?, aad = ?, nonce_b64 = ?, cipher_b64 = ?, kdf_salt_b64 = ?, created_at = ? WHERE id = ?",
      [
        row.alg,
        row.aad,
        row.nonce_b64,
        row.cipher_b64,
        row.kdf_salt_b64,
        row.created_at,
        row.id,
      ],
    );
  } else {
    await db.execute(
      "INSERT INTO e2ee_keys (id, user_id, provider, alg, aad, nonce_b64, cipher_b64, kdf_salt_b64, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        row.id,
        row.user_id,
        row.provider,
        row.alg,
        row.aad,
        row.nonce_b64,
        row.cipher_b64,
        row.kdf_salt_b64,
        row.created_at,
      ],
    );
  }
}

async function derivePBKDF2(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const pw = new TextEncoder().encode(password);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    pw,
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return new Uint8Array(bits);
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    bytes as unknown as BufferSource,
  );
  return new Uint8Array(hash);
}

export async function buildVerifierAAD(
  password: string,
  iterations = 10000,
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const d = await derivePBKDF2(password, salt, iterations);
  const h = await sha256(d);
  const obj = {
    v: 1,
    ver: {
      alg: "pbkdf2-sha256",
      iterations,
      saltB64: bytesToBase64(salt),
      hB64: bytesToBase64(h),
    },
  };
  return JSON.stringify(obj);
}

export function makeKeyId(userId: string, provider: ProviderKind) {
  return `${userId}:${provider}`;
}
