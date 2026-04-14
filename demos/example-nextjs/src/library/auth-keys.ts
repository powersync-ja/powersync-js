import { importJWK, type JWK, type KeyLike } from 'jose';

// For production, consider caching the imported key to avoid re-parsing on every request.
export async function getKeyPair(): Promise<{
  privateKey: KeyLike;
  publicJwk: JWK & { kid: string; alg: string };
  alg: string;
  kid: string;
}> {
  const envPrivate = process.env.POWERSYNC_PRIVATE_KEY;
  const envPublic = process.env.POWERSYNC_PUBLIC_KEY;

  if (!envPrivate || !envPublic) {
    throw new Error(
      'POWERSYNC_PRIVATE_KEY and POWERSYNC_PUBLIC_KEY are not set in .env.local. Run `pnpm generate-keys` and paste the output into .env.local, then restart the dev server.'
    );
  }

  const privateJwk = parseJwk('POWERSYNC_PRIVATE_KEY', envPrivate);
  const publicJwk = parseJwk('POWERSYNC_PUBLIC_KEY', envPublic);

  if (privateJwk.kid !== publicJwk.kid) {
    throw new Error(
      `POWERSYNC_PRIVATE_KEY and POWERSYNC_PUBLIC_KEY have mismatched kids (${privateJwk.kid} vs ${publicJwk.kid}). Run \`pnpm generate-keys\` to create a matching pair.`
    );
  }

  const privateKey = (await importJWK(privateJwk)) as KeyLike;
  return { privateKey, publicJwk, alg: privateJwk.alg, kid: privateJwk.kid };
}

function parseJwk(name: string, base64: string): JWK & { kid: string; alg: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(base64, 'base64').toString());
  } catch {
    throw new Error(`${name} could not be decoded. Run \`pnpm generate-keys\` and paste the output into .env.local.`);
  }

  const jwk = parsed as Partial<JWK> & { kid?: string; alg?: string };
  if (!jwk || typeof jwk !== 'object' || !jwk.kty || !jwk.alg || !jwk.kid) {
    throw new Error(
      `${name} is missing required JWK fields (kty, alg, kid). Run \`pnpm generate-keys\` to create a fresh pair.`
    );
  }
  return jwk as JWK & { kid: string; alg: string };
}
