import { getKeyPair } from '@/library/auth-keys';
import { NextResponse } from 'next/server';

// JWKS endpoint. PowerSync hits this to verify client tokens.
// See powersync/service.yaml -> client_auth.jwks_uri
export async function GET() {
  try {
    const { publicJwk } = await getKeyPair();
    return NextResponse.json({ keys: [publicJwk] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[api/auth/keys]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
