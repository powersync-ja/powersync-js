import { exportJWK, generateKeyPair as joseGenerateKeyPair, KeyLike } from 'jose';

interface KeyPair {
  privateKey: KeyLike;
  publicJwk: JsonWebKey & { kid: string; alg: string };
}

let cached: KeyPair | null = null;

export async function getKeyPair(): Promise<KeyPair> {
  if (cached) return cached;

  const { privateKey, publicKey } = await joseGenerateKeyPair('RS256', { extractable: true });
  const publicJwk = (await exportJWK(publicKey)) as JsonWebKey & { kid: string; alg: string };
  publicJwk.alg = 'RS256';
  publicJwk.kid = 'powersync-anon-key';

  cached = { privateKey, publicJwk };
  return cached;
}
