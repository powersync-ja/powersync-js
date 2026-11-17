const STORAGE_KEY = 'pixel-canvas-user-id';

/**
 * Stable per-browser id used to attribute pixels when there is no Supabase
 * session (standalone mode). When a backend is configured the anonymous auth
 * user id is used instead. Persisted so a returning visitor keeps their identity.
 */
export function getLocalUserId(): string {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = `local-${crypto.randomUUID()}`;
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
