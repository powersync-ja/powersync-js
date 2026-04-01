import { exportJWK, generateKeyPair as joseGenerateKeyPair, importJWK, KeyLike } from 'jose';

interface KeyPair {
  privateKey: KeyLike;
  publicJwk: JsonWebKey & { kid: string; alg: string };
}

/**
 * Generates a key pair if none is available on the env.
 * Uses globalThis to survive Next.js HMR — without this, dev-mode module
 * reloads regenerate the keys while the PowerSync service still holds the
 * old public key, causing "signature verification failed" errors.
 */
async function ensureKeyPair(): Promise<KeyPair> {
  const g = globalThis as Record<string, unknown>;
  if (g.__powersync_keypair) return g.__powersync_keypair as KeyPair;

  const envPrivate = process.env.POWERSYNC_PRIVATE_KEY;
  const envPublic = process.env.POWERSYNC_PUBLIC_KEY;

  let privateKey: KeyLike;
  let publicJwk: JsonWebKey & { kid: string; alg: string };

  if (envPrivate && envPublic) {
    const privateJwk = JSON.parse(Buffer.from(envPrivate, 'base64').toString());
    privateKey = (await importJWK(privateJwk)) as KeyLike;
    publicJwk = JSON.parse(Buffer.from(envPublic, 'base64').toString());
  } else {
    console.warn('POWERSYNC_PRIVATE_KEY not set. Generating a temporary key pair (will not survive restarts).');
    const generated = await joseGenerateKeyPair('RS256', { extractable: true });
    privateKey = generated.privateKey;
    publicJwk = (await exportJWK(generated.publicKey)) as JsonWebKey & { kid: string; alg: string };
    publicJwk.alg = 'RS256';
    publicJwk.kid = 'powersync-anon-key';
  }

  const pair: KeyPair = { privateKey, publicJwk };
  g.__powersync_keypair = pair;
  return pair;
}

export { ensureKeyPair as getKeyPair };
