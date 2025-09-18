import { useEffect, useMemo, useState } from 'react';
import type { CryptoProvider } from '@crypto/interface';
import { usePowerSync } from '@powersync/react';
import { useStatus } from '@powersync/react';
import { useQuery } from '@powersync/react';
import { startEncryptedMirrors, insertEncrypted, updateEncrypted, deleteEncrypted } from '@crypto/sqlite';
import { TODOS_PAIR } from '../encrypted/todosPair';
import LoadingSpinner from './LoadingSpinner';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { getCurrentUserId } from '../utils/supabase';

export function TodoList({ crypto }: { crypto: CryptoProvider }) {
  const db = usePowerSync();
  const status = useStatus();

  const [userId, setUserId] = useState<string | null>(null);
  const [text, setText] = useState('');

  // Resolve current user
  useEffect(() => {
    (async () => setUserId(await getCurrentUserId(true)))();
  }, []);

  // Start the mirror sync (decrypt -> parse -> upsert into mirror)
  useEffect(() => {
    if (!userId || !crypto) return;
    const stop = startEncryptedMirrors({ db, userId, crypto }, [TODOS_PAIR], {
      throttleMs: 150
    });
    return () => {
      try {
        stop();
      } catch {}
    };
  }, [db, userId, crypto]);

  // Query the PLAINTEXT mirror directly
  const {
    data: todos = [],
    isLoading,
    isFetching
  } = useQuery(
    `SELECT id, user_id, bucket_id, updated_at, text, completed
       FROM ${TODOS_PAIR.mirrorTable}
      WHERE user_id = ?
      ORDER BY updated_at DESC`,
    [userId ?? ''],
    { throttleMs: 200 }
  );

  async function addTodo() {
    if (!userId || !text.trim()) return;
    const id = cryptoRandomId();
    await insertEncrypted({ db, userId, crypto }, TODOS_PAIR, {
      id,
      object: { text: text.trim(), completed: false }
    });
    setText('');
  }

  async function toggle(todo: { id: string; text: string; completed: number }) {
    if (!userId) return;
    await updateEncrypted({ db, userId, crypto }, TODOS_PAIR, {
      id: todo.id,
      object: { text: todo.text, completed: !todo.completed }
    });
  }

  async function remove(id: string) {
    if (!userId) return;
    await deleteEncrypted({ db, userId, crypto }, TODOS_PAIR, { id });
  }

  const syncing = status.connecting || !!status.dataFlowStatus?.downloading || !!status.dataFlowStatus?.uploading;

  return (
    <div className="card">
      <div className="flex gap-2 mb-4">
        <input
          className="input flex-1"
          placeholder="Add a task"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTodo()}
        />
        <button className="btn" onClick={addTodo} disabled={!text.trim() || !userId}>
          <PlusIcon className="h-4 w-4" /> Add
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
          <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300">
            <LoadingSpinner size={16} />
            <span>Loading your tasks…</span>
          </div>
        </div>
      ) : todos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
          <p className="muted">No tasks yet. Add your first encrypted task above.</p>
        </div>
      ) : (
        <ul className="space-y-2 relative">
          {isFetching && (
            <div className="absolute -top-7 right-0 text-xs text-gray-500 inline-flex items-center gap-2">
              <LoadingSpinner size={12} />
              <span>Refreshing…</span>
            </div>
          )}
          {todos.map((t: any) => (
            <li key={t.id} className="p-3 rounded-md border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="size-4" checked={!!t.completed} onChange={() => toggle(t as any)} />
                  <span className={t.completed ? 'line-through opacity-70' : ''}>{(t as any).text}</span>
                </label>
                <button className="btn-secondary" onClick={() => remove(t.id)}>
                  <TrashIcon className="h-4 w-4" /> Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
        {status.connected ? (syncing ? 'Syncing…' : 'Synced') : 'Offline'}
      </div>
    </div>
  );
}

function cryptoRandomId() {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
