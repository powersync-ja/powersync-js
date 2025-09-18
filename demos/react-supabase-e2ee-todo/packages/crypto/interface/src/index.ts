export type KeyId = string;

export interface KdfParams {
  /** Base64 */
  saltB64: string;
  /** ops limit (e.g., libsodium MODERATE) */
  opsLimit?: number;
  /** mem limit (bytes) */
  memLimit?: number;
  /** algorithm name */
  alg?: string;
  /** iterations (for PBKDF2-style KDFs) */
  iterations?: number;
}

export interface EnvelopeHeader {
  /** semantic version of envelope format */
  v: 1;
  /** algorithm descriptor, e.g. "xchacha20poly1305/argon2id" */
  alg: string;
  /** optional associated data context */
  aad?: string;
  /** KDF parameters for key derivation */
  kdf: KdfParams;
}

export interface CipherEnvelope {
  header: EnvelopeHeader;
  /** Base64 nonce */
  nB64: string;
  /** Base64 ciphertext (includes auth tag for AEAD) */
  cB64: string;
}

// Generic column representation for storing CipherEnvelope in a DB row
export interface EncryptedColumns {
  alg: string;
  aad?: string | null;
  nonce_b64: string;
  cipher_b64: string;
  kdf_salt_b64: string;
}

/**
 * Convert a CipherEnvelope (+ optional explicit AAD) to flat DB columns.
 */
export function envelopeToColumns(env: CipherEnvelope, aad?: string | null): EncryptedColumns {
  return {
    alg: env.header.alg,
    aad: aad ?? env.header.aad ?? null,
    nonce_b64: env.nB64,
    cipher_b64: env.cB64,
    kdf_salt_b64: env.header.kdf.saltB64 ?? '',
  };
}

/**
 * Reconstruct a CipherEnvelope from flat DB columns.
 */
export function columnsToEnvelope(cols: EncryptedColumns): CipherEnvelope {
  return {
    header: {
      v: 1,
      alg: cols.alg,
      aad: cols.aad ?? undefined,
      kdf: { saltB64: cols.kdf_salt_b64 },
    },
    nB64: cols.nonce_b64,
    cB64: cols.cipher_b64,
  };
}

export interface CryptoProvider {
  /** Optional stable id for telemetry/rotation */
  readonly keyId?: KeyId;
  encrypt(plain: Uint8Array, aad?: string): Promise<CipherEnvelope>;
  decrypt(env: CipherEnvelope, aad?: string): Promise<Uint8Array>;
}

export interface PasswordInit {
  /** UTF-8 password */
  password: string;
  /** Provide to reuse an existing salt (base64). If omitted, a new salt is generated and embedded in the envelope. */
  saltB64?: string;
  /** Prefer WebCrypto PBKDF2 (even if Argon2id is available). */
  preferWebCrypto?: boolean;
}

// Note: Concrete provider specializations (e.g., PasswordCrypto, WebAuthnCrypto)
// are defined in their respective implementation packages to avoid tight coupling.

export function utf8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

export function base64ToBytes(b64: string): Uint8Array {
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }
  // Node
  return Uint8Array.from(Buffer.from(b64, 'base64'));
}

export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof btoa === 'function') {
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  // Node
  return Buffer.from(bytes).toString('base64');
}
