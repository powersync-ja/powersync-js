import type { CipherEnvelope, CryptoProvider, PasswordInit } from '@crypto/interface';
import { base64ToBytes, bytesToBase64 } from '@crypto/interface';
import sodium from 'libsodium-wrappers-sumo';

const ALG_ARGON = 'xchacha20poly1305/argon2id';
const ALG_PBKDF2 = 'xchacha20poly1305/pbkdf2';

export type PasswordCrypto = CryptoProvider & { readonly kind: 'password' };

export class PasswordProvider implements PasswordCrypto {
  readonly kind = 'password' as const;
  readonly keyId: undefined;

  private _password: string;
  private _saltB64?: string;
  private _preferWebCrypto: boolean;

  constructor(init: PasswordInit) {
    this._password = init.password;
    this._saltB64 = init.saltB64;
    this._preferWebCrypto = !!init.preferWebCrypto;
  }

  async encrypt(plain: Uint8Array, aad?: string): Promise<CipherEnvelope> {
    await sodium.ready;
    const salt = this._saltB64 ? base64ToBytes(this._saltB64) : sodium.randombytes_buf(16);

    let key: Uint8Array;
    let alg = ALG_ARGON;
    let kdfExtra: Record<string, any> = {};
    const hasArgon = typeof (sodium as any).crypto_pwhash === 'function' &&
      typeof (sodium as any).crypto_pwhash_ALG_ARGON2ID13 !== 'undefined';

    if (!this._preferWebCrypto && hasArgon) {
      key = sodium.crypto_pwhash(
        32,
        this._password,
        salt,
        sodium.crypto_pwhash_OPSLIMIT_MODERATE,
        sodium.crypto_pwhash_MEMLIMIT_MODERATE,
        sodium.crypto_pwhash_ALG_ARGON2ID13
      );
      kdfExtra = {
        opsLimit: sodium.crypto_pwhash_OPSLIMIT_MODERATE,
        memLimit: sodium.crypto_pwhash_MEMLIMIT_MODERATE,
        alg: 'argon2id13'
      };
    } else {
      // Fallback to WebCrypto PBKDF2 if argon2id isn't available in current build
      const iterations = 210000; // reasonable modern default
      key = await deriveKeyPBKDF2(this._password, salt, iterations);
      alg = ALG_PBKDF2;
      kdfExtra = { alg: 'pbkdf2-sha256', iterations };
    }

    const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);

    const ct = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      plain,
      aad ? new TextEncoder().encode(aad) : null,
      null,
      nonce,
      key
    );

    const env: CipherEnvelope = {
      header: {
        v: 1,
        alg,
        aad,
        kdf: {
          saltB64: bytesToBase64(salt),
          ...kdfExtra
        }
      },
      nB64: bytesToBase64(nonce),
      cB64: bytesToBase64(ct)
    };
    return env;
  }

  async decrypt(env: CipherEnvelope, aad?: string): Promise<Uint8Array> {
    await sodium.ready;
    if (!env.header.alg.startsWith('xchacha20poly1305')) {
      throw new Error(`Unsupported alg: ${env.header.alg}`);
    }
    // Prefer envelope aad if none provided
    const aadStr = aad ?? env.header.aad;
    const salt = base64ToBytes(env.header.kdf.saltB64);
    let key: Uint8Array;
    const isPBKDF2 = env.header.alg.includes('/pbkdf2') || env.header.kdf.alg === 'pbkdf2-sha256';
    if (isPBKDF2) {
      const iterations = env.header.kdf.iterations ?? 210000;
      key = await deriveKeyPBKDF2(this._password, salt, iterations);
    } else {
      const hasArgon = typeof (sodium as any).crypto_pwhash === 'function' &&
        typeof (sodium as any).crypto_pwhash_ALG_ARGON2ID13 !== 'undefined';
      if (!hasArgon) {
        throw new Error('Argon2id not available in current libsodium build');
      }
      key = sodium.crypto_pwhash(
        32,
        this._password,
        salt,
        sodium.crypto_pwhash_OPSLIMIT_MODERATE,
        sodium.crypto_pwhash_MEMLIMIT_MODERATE,
        sodium.crypto_pwhash_ALG_ARGON2ID13
      );
    }
    const nonce = base64ToBytes(env.nB64);
    const ct = base64ToBytes(env.cB64);

    const plain = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      ct,
      aadStr ? new TextEncoder().encode(aadStr) : null,
      nonce,
      key
    );
    return plain;
  }
}

export function createPasswordCrypto(init: PasswordInit): PasswordCrypto {
  return new PasswordProvider(init);
}

async function deriveKeyPBKDF2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const pw = new TextEncoder().encode(password);
  const keyMaterial = await crypto.subtle.importKey('raw', pw, 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: (salt as unknown as BufferSource), iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return new Uint8Array(bits);
}
