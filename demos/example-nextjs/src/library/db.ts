import { Pool } from 'pg';

const kPool = Symbol.for('powersync-demo-pg-pool');
const g = globalThis as typeof globalThis & { [kPool]?: Pool };

export function getPool(): Pool {
  if (!g[kPool]) {
    g[kPool] = new Pool({ connectionString: process.env.DATABASE_URL });
    g[kPool].on('error', (err) => console.error('Postgres pool error', err));
  }
  return g[kPool];
}
