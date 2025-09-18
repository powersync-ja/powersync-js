import type { AbstractPowerSyncDatabase } from "@powersync/web";
import type { CipherEnvelope, CryptoProvider, EncryptedColumns} from "@crypto/interface";
import sodium from "libsodium-wrappers";
import { bytesToBase64, base64ToBytes } from "@crypto/interface";


/** Mirror column definition (SQLite flavor) */
export type MirrorColumnDef = {
  name: string;           // e.g., "text", "completed", "priority"
  type: string;           // e.g., "TEXT", "INTEGER", "REAL", "BLOB", "NUMERIC"
  notNull?: boolean;
  defaultExpr?: string;   // raw SQL default expression (e.g., "0", "'pending'")
};

/** Values mapped into the mirror (by parsePlain) */
export type MirrorValues = Record<string, any>;

/** How to parse decrypted bytes into mirror column values */
export type ParsePlainFn = (args: {
  plaintext: Uint8Array;
  aad?: string;
  encryptedRow: {
    id: string;
    user_id: string;
    bucket_id: string | null;
    updated_at: string;
    alg: string;
  };
}) => MirrorValues;

/** Optional serializer for domain object -> bytes to encrypt */
export type SerializePlainFn<T = any> =
  (obj: T) => { plaintext: Uint8Array; aad?: string };

/** Pair config: one encrypted table <-> one mirror table with custom columns */
export type EncryptedPairConfig<TSerialize = any> = {
  name: string;
  encryptedTable: string;         // visible to PowerSync (Sync Rules `type`)
  mirrorTable: string;            // local-only plaintext table with custom columns
  mirrorColumns: MirrorColumnDef[]; // custom columns (id/user_id/bucket_id/updated_at are implicit)
  aad?: string;                    // default AAD for encryption
  parsePlain: ParsePlainFn;        // bytes -> column values
  serializePlain?: SerializePlainFn<TSerialize>; // object -> bytes (optional)
  mirrorExtraIndexes?: string[];   // optional: extra CREATE INDEX statements
};

export type EncryptedRuntime = {
  db: AbstractPowerSyncDatabase;
  userId: string;
  crypto: CryptoProvider;
};

export type MirrorBaseRow = {
  id: string;
  user_id: string;
  bucket_id: string | null;
  updated_at: string;   // ISO 8601
};



export type RawEncryptedRow = EncryptedColumns & {
  id: string;
  user_id: string;
  bucket_id: string | null;
  updated_at: string;
  // ...any extra SELECTed columns can go here
};

/**
 * Utility: columns -> envelope for decrypt(), now **generic & type-safe**.
 * Constrain T so the compiler ensures the required fields exist.
 *
 * Usage:
 *   type RawRow = EnvelopeColumns & { id: string; user_id: string; ... };
 *   const env = columnsToEnvelope<RawRow>(row);
 */
export function columnsToEnvelope<T extends EncryptedColumns>(args: T): CipherEnvelope {
  return {
    header: {
      v: 1,
      alg: args.alg,
      aad: args.aad ?? undefined,
      kdf: { saltB64: args.kdf_salt_b64 ?? "" }
    },
    nB64: args.nonce_b64,
    cB64: args.cipher_b64
  };
}

/** Utility: UTF-8 encoder (no external dep) */
export function utf8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/** Symmetric crypto provider that operates with a raw DEK (Uint8Array). */
export class DEKCryptoProvider implements CryptoProvider {
  readonly keyId = undefined;
  private key: Uint8Array;
  private static readonly ALG = "xchacha20poly1305/raw";

  constructor(key: Uint8Array) {
    this.key = key;
  }

  async encrypt(plain: Uint8Array, aad?: string): Promise<CipherEnvelope> {
    await sodium.ready;
    const nonce = sodium.randombytes_buf(
      sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES,
    );
    const ct = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      plain,
      aad ? new TextEncoder().encode(aad) : null,
      null,
      nonce,
      this.key,
    );
    return {
      header: { v: 1, alg: DEKCryptoProvider.ALG, aad, kdf: { saltB64: "" } },
      nB64: bytesToBase64(nonce),
      cB64: bytesToBase64(ct),
    };
  }

  async decrypt(env: CipherEnvelope, aad?: string): Promise<Uint8Array> {
    await sodium.ready;
    const nonce = base64ToBytes(env.nB64);
    const ct = base64ToBytes(env.cB64);
    return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      ct,
      (aad ?? env.header.aad)
        ? new TextEncoder().encode(aad ?? env.header.aad!)
        : null,
      nonce,
      this.key,
    );
  }
}

export async function generateDEK(): Promise<Uint8Array> {
  await sodium.ready;
  return sodium.randombytes_buf(32);
}

export function createDEKCrypto(dek: Uint8Array): DEKCryptoProvider {
  return new DEKCryptoProvider(dek);
}