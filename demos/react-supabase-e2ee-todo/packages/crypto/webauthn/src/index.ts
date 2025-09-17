import type { CipherEnvelope, CryptoProvider } from '@crypto/interface';
import { bytesToBase64, base64ToBytes } from '@crypto/interface';
import sodium from 'libsodium-wrappers';

// Experimental WebAuthn-based key derivation using PRF/hmac-secret extensions.
// This derives a stable per-credential secret to use as an AEAD key.

export type WebAuthnCrypto = CryptoProvider & { readonly kind: 'webauthn' };

export interface WebAuthnInit {
  keyId: string; // used to store credential id locally
  rpId?: string; // optional relying party id
}

type PublicKeyCredentialWithPRF = PublicKeyCredential & {
  getClientExtensionResults(): AuthenticationExtensionsClientOutputs & {
    prf?: { results?: { first?: ArrayBuffer; second?: ArrayBuffer } };
    hmacCreateSecret?: ArrayBuffer;
  };
};

const ALG = 'xchacha20poly1305/webauthn-prf';

export class WebAuthnProvider implements WebAuthnCrypto {
  readonly kind = 'webauthn' as const;
  readonly keyId: string;
  private rpId?: string;

  constructor(opts: WebAuthnInit) {
    this.keyId = opts.keyId;
    this.rpId = opts.rpId;
  }

  static isSupported(): boolean {
    return typeof window !== 'undefined' && !!window.PublicKeyCredential && !!navigator.credentials;
  }

  get storedCredentialId(): ArrayBuffer | null {
    const b64 = localStorage.getItem(this._credKey());
    return b64 ? (base64ToBytes(b64).buffer as ArrayBuffer) : null;
  }

  async register(userLabel: string = 'User'): Promise<void> {
    if (!WebAuthnProvider.isSupported()) throw new Error('WebAuthn not supported');
    const userId = crypto.getRandomValues(new Uint8Array(16));
    const publicKey: PublicKeyCredentialCreationOptions = {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: 'PowerSync E2EE', id: this.rpId },
        user: { id: userId, name: userLabel, displayName: userLabel },
        // Include both ES256 (-7) and RS256 (-257)
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },    // ES256 (preferred)
          { type: 'public-key', alg: -257 },  // RS256
        ],
        authenticatorSelection: { userVerification: 'preferred', residentKey: 'preferred' },
        timeout: 60_000,
        attestation: 'none', // optional but commonly used
        extensions: {
          // For PRF, registration typically just enables the extension;
          // you evaluate it during get()/assertion.
          // Spec: use `enabled: true` (not `enable`).
          prf: {  } 
        },
      }
    const cred = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
    if (!cred) throw new Error('Credential creation failed');
    const rawId = new Uint8Array(cred.rawId);
    localStorage.setItem(this._credKey(), bytesToBase64(rawId));
  }

  private _credKey() {
    return `webauthn.cred.${this.keyId}`;
  }

  private async deriveSecret(context: string): Promise<Uint8Array> {
    if (!WebAuthnProvider.isSupported()) throw new Error('WebAuthn not supported');
    const credId = this.storedCredentialId;
    if (!credId) throw new Error('No registered credential');
    const allow: PublicKeyCredentialDescriptor[] = [{ type: 'public-key', id: credId }];
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const salt = new TextEncoder().encode('psync:' + context);
    const publicKey: PublicKeyCredentialRequestOptions = {
      challenge,
      rpId: this.rpId,
      allowCredentials: allow,
      userVerification: 'preferred',
      timeout: 60_000,
      extensions: { prf: { eval: { first: salt.buffer } }  },
    };
    const assertion = (await navigator.credentials.get({ publicKey })) as PublicKeyCredentialWithPRF | null;
    if (!assertion) throw new Error('Assertion failed');
    const ext = assertion.getClientExtensionResults();
    const prf = ext.prf?.results?.first as ArrayBuffer | undefined;
    if (prf) {
      return new Uint8Array(prf).slice(0, 32);
    }

    throw new Error('WebAuthn PRF/hmac-secret not available');
  }

  async encrypt(plain: Uint8Array, aad?: string): Promise<CipherEnvelope> {
    await sodium.ready;
    const key = await this.deriveSecret(aad ?? 'default');
    const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
    const ct = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      plain,
      aad ? new TextEncoder().encode(aad) : null,
      null,
      nonce,
      key
    );
    return {
      header: { v: 1, alg: ALG, aad, kdf: { saltB64: '' } },
      nB64: bytesToBase64(nonce),
      cB64: bytesToBase64(ct),
    };
  }

  async decrypt(env: CipherEnvelope, aad?: string): Promise<Uint8Array> {
    await sodium.ready;
    if (!env.header.alg.startsWith('xchacha20poly1305/webauthn')) {
      // continue if different label but same primitive
    }
    const key = await this.deriveSecret(aad ?? env.header.aad ?? 'default');
    const nonce = base64ToBytes(env.nB64);
    const ct = base64ToBytes(env.cB64);
    const plain = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      ct,
      (aad ?? env.header.aad) ? new TextEncoder().encode(aad ?? env.header.aad!) : null,
      nonce,
      key
    );
    return plain;
  }

  /**
   * Probe whether PRF/hmac-secret derivation is available for the stored credential.
   * This will attempt a lightweight derive and return true/false instead of throwing.
   * Triggers a WebAuthn assertion prompt.
   */
  async probe(context: string = 'probe'): Promise<boolean> {
    try {
      await this.deriveSecret(context);
      return true;
    } catch {
      return false;
    }
  }
}

export function createWebAuthnCrypto(init: WebAuthnInit): WebAuthnCrypto {
  return new WebAuthnProvider(init);
}
