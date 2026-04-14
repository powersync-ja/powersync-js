import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    pool.on('error', (err) => console.error('Postgres pool error', err));
  }
  return pool;
}
