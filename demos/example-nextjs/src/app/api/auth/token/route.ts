import { getKeyPair } from '@/library/auth-keys';
import { JWT_ISSUER, POWERSYNC_URL } from '@/library/auth-config';
import { SignJWT } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('user_id') ?? 'anonymous';
    const { privateKey, alg, kid } = await getKeyPair();

    const token = await new SignJWT({})
      .setProtectedHeader({ alg, kid })
      .setSubject(userId)
      .setIssuedAt()
      .setIssuer(JWT_ISSUER)
      .setAudience(POWERSYNC_URL)
      .setExpirationTime('5m')
      .sign(privateKey);

    return NextResponse.json({ token, powersync_url: POWERSYNC_URL });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[api/auth/token]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
