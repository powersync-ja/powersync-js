import { getPool } from '@/library/db';
import { NextRequest, NextResponse } from 'next/server';

type Op = 'PUT' | 'PATCH' | 'DELETE';

interface CrudEntry {
  op: Op;
  table: string;
  id: string;
  data?: Record<string, unknown>;
}

function escapeId(id: string) {
  return `"${id.replace(/"/g, '""').replace(/\./g, '"."')}"`;
}

async function applyBatch(batch: CrudEntry[]) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const entry of batch) {
      const table = escapeId(entry.table);
      if (entry.op === 'PUT') {
        const row = { ...entry.data, id: entry.id };
        const cols = Object.keys(row).map(escapeId).join(', ');
        const updateClauses = Object.keys(row)
          .filter((k) => k !== 'id')
          .map((k) => `${escapeId(k)} = EXCLUDED.${escapeId(k)}`)
          .join(', ');
        const upsertSuffix = updateClauses ? `DO UPDATE SET ${updateClauses}` : 'DO NOTHING';
        await client.query(
          `WITH r AS (SELECT (json_populate_record(null::${table}, $1::json)).*)
           INSERT INTO ${table} (${cols}) SELECT ${cols} FROM r
           ON CONFLICT(id) ${upsertSuffix}`,
          [JSON.stringify(row)]
        );
      } else if (entry.op === 'PATCH') {
        const row = { ...entry.data, id: entry.id };
        const setClauses = Object.keys(entry.data ?? {})
          .filter((k) => k !== 'id')
          .map((k) => `${escapeId(k)} = r.${escapeId(k)}`)
          .join(', ');
        if (setClauses) {
          await client.query(
            `WITH r AS (SELECT (json_populate_record(null::${table}, $1::json)).*)
             UPDATE ${table} SET ${setClauses} FROM r WHERE ${table}.id = r.id`,
            [JSON.stringify(row)]
          );
        }
      } else if (entry.op === 'DELETE') {
        await client.query(`DELETE FROM ${table} WHERE id = $1`, [entry.id]);
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // PowerSync sends: { batch: CrudEntry[] }
    const batch: CrudEntry[] = body.batch ?? [];
    await applyBatch(batch);
    return NextResponse.json({ status: 'ok' });
  } catch (err: unknown) {
    console.error('Data upload error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
