import { getKeyPair } from '@/library/auth-keys';
import { SignJWT } from 'jose';
import { NextResponse } from 'next/server';

const POWERSYNC_URL = process.env.POWERSYNC_URL ?? 'http://localhost:8080';

/** Returns a signed JWT for PowerSync. No login required. */
export async function GET() {
  const { privateKey, publicJwk } = await getKeyPair();

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', kid: publicJwk.kid })
    .setSubject('anonymous')
    .setIssuedAt()
    .setIssuer(process.env.JWT_ISSUER ?? 'powersync-nextjs-demo')
    .setAudience(POWERSYNC_URL)
    .setExpirationTime('5m')
    .sign(privateKey);

  return NextResponse.json({ token, powersync_url: POWERSYNC_URL });
}
