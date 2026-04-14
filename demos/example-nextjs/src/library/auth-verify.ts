import { getKeyPair } from '@/library/auth-keys';
import { JWT_ISSUER, POWERSYNC_URL } from '@/library/auth-config';
import { importJWK, jwtVerify, type KeyLike } from 'jose';
import type { NextRequest } from 'next/server';

async function getVerificationKey(): Promise<KeyLike> {
  const { publicJwk } = await getKeyPair();
  return (await importJWK(publicJwk)) as KeyLike;
}

export async function verifyRequest(req: NextRequest): Promise<void> {
  const header = req.headers.get('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new Error('Missing bearer token');
  }
  const key = await getVerificationKey();
  await jwtVerify(match[1], key, {
    issuer: JWT_ISSUER,
    audience: POWERSYNC_URL
  });
}
