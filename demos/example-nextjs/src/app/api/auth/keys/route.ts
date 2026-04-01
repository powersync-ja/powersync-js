import { getKeyPair } from '@/library/auth-keys';
import { NextResponse } from 'next/server';

// JWKS endpoint. PowerSync hits this to verify client tokens.
// See powersync/service.yaml -> client_auth.jwks_uri
export async function GET() {
  const { publicJwk } = await getKeyPair();
  return NextResponse.json({ keys: [publicJwk] });
}
