'use client';

import type { Customer } from '@/lib/powersync/schema';
import { usePowerSync, useQuery } from '@powersync/react';
import { useState } from 'react';

export function CustomerList() {
  const db = usePowerSync();
  const { data: customers } = useQuery<Customer>('SELECT id, name FROM customers ORDER BY created_at ASC');
  const [input, setInput] = useState('');

  const addCustomer = async () => {
    const name = input.trim();
    if (!name) return;
    await db.execute(`INSERT INTO customers (id, name, created_at) VALUES (uuid(), ?, datetime('now'))`, [name]);
    setInput('');
  };

  const deleteCustomer = async (id: string) => {
    await db.execute('DELETE FROM customers WHERE id = ?', [id]);
  };

  return (
    <div className="mt-4 rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-4 text-lg font-semibold text-text">
        Customers
        <span className="ml-2 inline-flex h-5.5 min-w-5.5 items-center justify-center rounded-full bg-border px-1.5 align-middle text-xs font-medium text-text-muted">
          {customers.length}
        </span>
      </h2>

      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Add customer…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCustomer()}
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
        />
        <button
          onClick={addCustomer}
          disabled={!input.trim()}
          title="Add"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-text-muted transition-colors hover:text-primary disabled:opacity-30 disabled:hover:text-text-muted"
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
          </svg>
        </button>
      </div>

      {customers.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">No customers yet. Add one above.</p>
      ) : (
        <ul className="divide-y divide-border">
          {customers.map((c) => (
            <li key={c.id} className="group flex items-center justify-between py-2">
              <span className="text-sm text-text">{c.name}</span>
              <button
                onClick={() => deleteCustomer(c.id!)}
                title="Delete"
                className="rounded-md p-1 text-text-muted opacity-0 transition-all hover:text-danger group-hover:opacity-100"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
