import { BaseObserver, type BaseListener } from '@powersync/common';
import type { WebPowerSyncDatabase } from '../db/PowerSyncDatabase.js';

interface RegistryListener extends BaseListener {
  databasesChanged: (databases: readonly WebPowerSyncDatabase[]) => void;
}

/**
 * Live database instances in this page, for development tooling.
 *
 * Every {@link WebPowerSyncDatabase} registers itself when constructed and leaves when closed, so a
 * tool that runs in the same page (for example the diagnostics Vite plugin's injected agent) can find
 * the app's databases without the app wiring anything up. The set holds only instances that already
 * exist, so it adds nothing to a production bundle beyond the references themselves.
 */
class DatabaseRegistry extends BaseObserver<RegistryListener> {
  readonly databases = new Set<WebPowerSyncDatabase>();

  notify(): void {
    const snapshot = [...this.databases];
    this.iterateListeners((listener) => listener.databasesChanged?.(snapshot));
  }
}

const registry = new DatabaseRegistry();

/** @internal Called by the database constructor. */
export function registerDatabase(db: WebPowerSyncDatabase): void {
  registry.databases.add(db);
  registry.notify();
}

/** @internal Called when the database closes. */
export function unregisterDatabase(db: WebPowerSyncDatabase): void {
  if (registry.databases.delete(db)) {
    registry.notify();
  }
}

/** The databases currently open in this page. */
export function getRegisteredDatabases(): readonly WebPowerSyncDatabase[] {
  return [...registry.databases];
}

/**
 * Calls `listener` with the current databases now, and again whenever one is opened or closed.
 * Returns a function that stops listening.
 */
export function observeRegisteredDatabases(listener: (databases: readonly WebPowerSyncDatabase[]) => void): () => void {
  const stop = registry.registerListener({ databasesChanged: listener });
  listener([...registry.databases]);
  return stop;
}
