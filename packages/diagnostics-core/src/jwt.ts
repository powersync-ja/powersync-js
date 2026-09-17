import { isRecord } from './json.js';

/** What a JWT says about who it is for and how long it lasts. */
export interface TokenClaims {
  subject: string;
  /** Epoch milliseconds, or null when the token does not expire. */
  expiresAt: number | null;
}

/**
 * The claims the diagnostics tool reads from a JWT, or null when the token cannot be decoded or names
 * no subject.
 *
 * Only the payload is read; the signature is not checked. The tool uses the claims to label a session,
 * never to trust it.
 */
export function decodeTokenClaims(token: string): TokenClaims | null {
  try {
    const payload = token.split('.')[1];
    if (payload === undefined) {
      return null;
    }
    // JWT segments are base64url; atob only reads standard base64.
    const standard = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded: unknown = JSON.parse(atob(standard.padEnd(Math.ceil(standard.length / 4) * 4, '=')));
    if (!isRecord(decoded) || typeof decoded.sub !== 'string') {
      return null;
    }
    const expiresAt = typeof decoded.exp === 'number' ? decoded.exp * 1000 : null;
    return { subject: decoded.sub, expiresAt };
  } catch {
    return null;
  }
}

/** The `sub` claim of a JWT, or null when the token cannot be decoded. */
export const decodeTokenSubject = (token: string): string | null => decodeTokenClaims(token)?.subject ?? null;
