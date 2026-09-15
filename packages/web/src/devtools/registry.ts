import type { WebPowerSyncDatabase } from '../db/PowerSyncDatabase.js';

/**
 * Live database instances in this page, for development tooling.
 *
 * Every {@link WebPowerSyncDatabase} registers itself when constructed and leaves when closed, so a
 * tool that runs in the same page (for example the diagnostics Vite plugin's injected agent) can find
 * the app's databases without the app wiring anything up. The set holds only instances that already
 * exist, so it adds nothing to a production bundle beyond the references themselves.
 */
const databases = new Set<WebPowerSyncDatabase>();
const listeners = new Set<(databases: readonly WebPowerSyncDatabase[]) => void>();

function notify(): void {
  const snapshot = [...databases];
  for (const listener of listeners) {
    listener(snapshot);
  }
}

/** @internal Called by the database constructor. */
export function registerDatabase(db: WebPowerSyncDatabase): void {
  databases.add(db);
  notify();
}

/** @internal Called when the database closes. */
export function unregisterDatabase(db: WebPowerSyncDatabase): void {
  if (databases.delete(db)) {
    notify();
  }
}

/** The databases currently open in this page. */
export function getRegisteredDatabases(): readonly WebPowerSyncDatabase[] {
  return [...databases];
}

/**
 * Calls `listener` with the current databases now, and again whenever one is opened or closed.
 * Returns a function that stops listening.
 */
export function observeRegisteredDatabases(
  listener: (databases: readonly WebPowerSyncDatabase[]) => void
): () => void {
  listeners.add(listener);
  listener([...databases]);
  return () => {
    listeners.delete(listener);
  };
}
