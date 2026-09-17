import { describe, expect, it } from 'vitest';

import { isSameIdentity, keepsDataFor, type SessionIdentity } from '../src/web/session-identity';

const identity = (endpoint: string, subject: string | null): SessionIdentity => ({ endpoint, subject });

describe('isSameIdentity', () => {
  it('is the same user only on the same instance', () => {
    expect(
      isSameIdentity(identity('https://a.journeyapps.com', 'u1'), identity('https://a.journeyapps.com', 'u1'))
    ).toBe(true);
    expect(
      isSameIdentity(identity('https://a.journeyapps.com', 'u1'), identity('https://b.journeyapps.com', 'u1'))
    ).toBe(false);
    expect(
      isSameIdentity(identity('https://a.journeyapps.com', 'u1'), identity('https://a.journeyapps.com', 'u2'))
    ).toBe(false);
  });

  it('treats a token with no subject as its own identity', () => {
    expect(
      isSameIdentity(identity('https://a.journeyapps.com', null), identity('https://a.journeyapps.com', null))
    ).toBe(true);
    expect(
      isSameIdentity(identity('https://a.journeyapps.com', null), identity('https://a.journeyapps.com', 'u1'))
    ).toBe(false);
  });
});

describe('keepsDataFor', () => {
  const session = identity('https://a.journeyapps.com', 'u1');

  it('keeps what the same user downloaded on the same instance', () => {
    expect(keepsDataFor(session, session)).toBe(true);
  });

  it('drops another user, and another instance', () => {
    expect(keepsDataFor(identity('https://a.journeyapps.com', 'u2'), session)).toBe(false);
    expect(keepsDataFor(identity('https://b.journeyapps.com', 'u1'), session)).toBe(false);
  });

  it('drops a database it cannot account for, so no one sees the last user rows', () => {
    expect(keepsDataFor(null, session)).toBe(false);
  });
});
