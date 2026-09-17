import { isRecord } from '../json.js';

/**
 * Who a diagnostics session syncs as, and from where: what decides whether the last session's data
 * is this one's to keep.
 */
export interface SessionIdentity {
  endpoint: string;
  /** The token subject, or null when the token carries none. */
  subject: string | null;
}

/** Remembers the identity of the session that last used the local database. */
export interface SessionIdentityStore {
  read(): SessionIdentity | null;
  remember(identity: SessionIdentity): void;
}

export const isSameIdentity = (a: SessionIdentity, b: SessionIdentity): boolean =>
  a.endpoint === b.endpoint && a.subject === b.subject;

const DEFAULT_STORAGE_KEY = 'powersync-diagnostics:last-session';

const parseIdentity = (text: string): SessionIdentity | null => {
  const parsed: unknown = JSON.parse(text);
  if (
    isRecord(parsed) &&
    typeof parsed.endpoint === 'string' &&
    (typeof parsed.subject === 'string' || parsed.subject === null)
  ) {
    return { endpoint: parsed.endpoint, subject: parsed.subject };
  }
  return null;
};

/**
 * Keeps the identity in `localStorage`, so it outlives the page the way the database does.
 *
 * Storage can be unavailable or refused; both read as "no last session", and the next connect then
 * treats the database as another user's and clears it.
 */
export function createLocalStorageIdentityStore(storageKey = DEFAULT_STORAGE_KEY): SessionIdentityStore {
  return {
    read() {
      try {
        const stored = localStorage.getItem(storageKey);
        return stored === null ? null : parseIdentity(stored);
      } catch {
        return null;
      }
    },
    remember(identity) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(identity));
      } catch {
        // Nothing to do: the next connect treats the database as another user's.
      }
    }
  };
}
