import { describe, expect, it } from 'vitest';

import { decodeTokenClaims, decodeTokenSubject } from '../src/jwt';

/** A JWT is header.payload.signature, base64url, and only the payload is read. */
const jwtWithPayload = (payload: Record<string, unknown>) =>
  `header.${btoa(JSON.stringify(payload)).replace(/=+$/, '')}.signature`;

describe('decodeTokenSubject', () => {
  it('reads the subject out of a token', () => {
    expect(decodeTokenSubject(jwtWithPayload({ sub: 'user-42', aud: 'powersync' }))).toBe('user-42');
  });

  it('returns null rather than throwing on anything that is not a token with a subject', () => {
    expect(decodeTokenSubject(jwtWithPayload({ aud: 'powersync' }))).toBeNull();
    expect(decodeTokenSubject('not-a-token')).toBeNull();
    expect(decodeTokenSubject('')).toBeNull();
  });
});

describe('decodeTokenClaims', () => {
  it('reads the subject and turns the expiry into milliseconds', () => {
    expect(decodeTokenClaims(jwtWithPayload({ sub: 'user-42', exp: 1_700_000_000 }))).toEqual({
      subject: 'user-42',
      expiresAt: 1_700_000_000_000
    });
  });

  it('reports no expiry when the token has none, and reads a base64url payload', () => {
    const token = jwtWithPayload({ sub: 'user/42+x' }).replace(/\+/g, '-').replace(/\//g, '_');
    expect(decodeTokenClaims(token)).toEqual({ subject: 'user/42+x', expiresAt: null });
  });
});
