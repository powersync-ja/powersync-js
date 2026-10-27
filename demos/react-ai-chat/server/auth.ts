import type { RequestHandler } from 'express';
import { base64url, jwtVerify, SignJWT } from 'jose';

// This stands in for real sign-in. The app makes up a user id and the backend issues a token for it, no questions
// asked, so anyone who knows a user id can get a token for it and read that user's chats. A real app issues tokens
// only to users who have signed in.

/** The key's id. PowerSync finds the key to verify tokens with by it (see powersync/service.yaml). */
const KEY_ID = 'ai-chat-dev';
const AUDIENCE = 'powersync';
const TOKEN_LIFETIME_SECONDS = 60 * 60;

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set. Copy .env.local.template to .env.local.');
const key = base64url.decode(process.env.JWT_SECRET);

/**
 * Signs a token for a user. PowerSync accepts it to sync the user's data, and the backend accepts it for the user's
 * requests. `expires_at` is in milliseconds since the epoch.
 */
export async function issueToken(userId: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_LIFETIME_SECONDS;
  const token = await new SignJWT()
    .setProtectedHeader({ alg: 'HS256', kid: KEY_ID })
    .setSubject(userId)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(key);
  return { token, expires_at: expiresAt * 1000 };
}

/**
 * Only lets requests through with a token from {@link issueToken} (`Authorization: Bearer <token>`), and sets
 * `res.locals.userId` to the user it was issued to. Responds 401 otherwise.
 */
export const authenticate: RequestHandler = async (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer /, '') ?? '';
  try {
    const { payload } = await jwtVerify(token, key, { audience: AUDIENCE, requiredClaims: ['sub'] });
    res.locals.userId = payload.sub;
  } catch {
    res.status(401).json({ error: 'Missing or invalid token' });
    return;
  }
  next();
};
