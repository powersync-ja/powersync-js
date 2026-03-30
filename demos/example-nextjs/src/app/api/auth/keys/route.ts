import { getKeyPair } from '@/lib/auth-keys';
import { NextResponse } from 'next/server';

/**
 * JWKS endpoint consumed by the PowerSync service to validate client JWTs.
 * Configured in powersync/service.yaml as client_auth.jwks_uri.
 */
export async function GET() {
  const { publicJwk } = await getKeyPair();
  return NextResponse.json({ keys: [publicJwk] });
}
