// RSA key pair for signing PowerSync JWTs.
// Generated once per process. Stored on globalThis so the key pair
// survives Next.js HMR re-evaluations in development.
// In production, persist these in env vars so tokens survive restarts.

import { exportJWK, generateKeyPair as joseGenerateKeyPair, KeyLike } from 'jose';

interface KeyPair {
  privateKey: KeyLike;
  publicJwk: JsonWebKey & { kid: string; alg: string };
}

const kKeyPair = Symbol.for('powersync-demo-keypair');
const g = globalThis as typeof globalThis & { [kKeyPair]?: KeyPair };

export async function getKeyPair(): Promise<KeyPair> {
  if (g[kKeyPair]) return g[kKeyPair];

  const { privateKey, publicKey } = await joseGenerateKeyPair('RS256', { extractable: true });
  const publicJwk = (await exportJWK(publicKey)) as JsonWebKey & { kid: string; alg: string };
  publicJwk.alg = 'RS256';
  publicJwk.kid = 'powersync-anon-key';

  const pair: KeyPair = { privateKey, publicJwk };
  g[kKeyPair] = pair;
  return pair;
}
