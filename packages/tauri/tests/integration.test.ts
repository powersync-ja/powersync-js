import { vi, test as baseTest, expect, onTestFinished } from 'vitest';
import { column, Schema, Table } from '@powersync/common';
import { PowerSyncTauriDatabase, TauriPowerSyncOpenOptions } from '../guest-js/database';

async function installTauriInTestFrameHack() {
  // Tauri injects these getters on the top-level window so that it can communicate with Rust.
  // vitest runs this in an iframe though, so we forward definitions.
  const root = window.top as any;
  const current = window as any;

  await vi.waitFor(async () => {
    expect(root.__TAURI_INTERNALS__).toBeDefined();
    expect(root.__TAURI_EVENT_PLUGIN_INTERNALS__).toBeDefined();
  });

  current.__TAURI_INTERNALS__ = root.__TAURI_INTERNALS__;
  current.__TAURI_EVENT_PLUGIN_INTERNALS__ = root.__TAURI_EVENT_PLUGIN_INTERNALS__;
}

const schema = new Schema({
  users: new Table({
    name: column.text
  })
});

const test = baseTest.extend('tauriHack', { auto: true }, async () => {
  await installTauriInTestFrameHack();
});

function openDatabase(options: Partial<TauriPowerSyncOpenOptions>) {
  const db = new PowerSyncTauriDatabase({
    database: {
      dbFilename: ':memory:'
    },
    schema: new Schema([]),
    ...options
  });
  onTestFinished(() => db.close());
  return db;
}

test('stream subscriptions', async () => {
  const db = openDatabase({ schema });
  await db.init();
  expect(db.currentStatus.syncStreams).toHaveLength(0);

  const subscription = await db.syncStream('foo').subscribe();
  await vi.waitFor(() => {
    expect(db.currentStatus.syncStreams).toHaveLength(1);
  });
});

test('watch smoke test', async () => {
  const db = openDatabase({ schema });
  const fn = vi.fn();
  const disposeWatch = db.onChangeWithCallback(
    {
      onChange: () => {
        fn();
      }
    },
    { tables: ['users'], throttleMs: 0 }
  );

  await db.execute('INSERT INTO users (id, name) VALUES (uuid(), ?)', ['first']);
  await expect.poll(() => fn).toHaveBeenCalledOnce();

  await db.writeTransaction(async (tx) => {
    await tx.execute('INSERT INTO users (id, name) VALUES (uuid(), ?)', ['second']);
  });
  await expect.poll(() => fn).toHaveBeenCalledTimes(2);

  await db.writeTransaction(async (tx) => {
    await tx.execute('DELETE FROM users;');
    await tx.rollback();
  });
  await expect.poll(() => fn).toHaveBeenCalledTimes(2);

  disposeWatch();
  await db.execute('INSERT INTO users (id, name) VALUES (uuid(), ?)', ['fourth']);
  await expect.poll(() => fn).toHaveBeenCalledTimes(2);
});

test('can close instances', async () => {
  const first = openDatabase({ schema });
  await first.execute('INSERT INTO users (id, name) VALUES (uuid(), ?)', ['First user']);
  expect(await first.getAll('SELECT * FROM users')).toHaveLength(1);
  await first.close();

  // Because we're using in-memory databases, the second instance should open a fresh
  // database.
  const second = openDatabase({ schema });
  expect(await second.getAll('SELECT * FROM users')).toHaveLength(0);
});
