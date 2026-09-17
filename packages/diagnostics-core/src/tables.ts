import type { SdkIntegration } from './integration.js';
import { isRecord } from './json.js';

/**
 * The part of an integration these reads need: `runQuery` alone.
 *
 * Declared as a pick rather than the whole interface so a test can stand in for it without building an
 * integration, and so the reads state what they actually use.
 */
export type QueryRunner = Pick<SdkIntegration, 'runQuery'>;

/**
 * When operations outnumber rows by this much, the bucket is carrying history that a compact or
 * defragment would clear. The same factor the standalone diagnostics client warns at.
 * @see https://docs.powersync.com/maintenance-ops/compacting-buckets#when-to-defragment
 */
const OPERATION_HISTORY_FACTOR = 3;

/** Whether a row and operation count are far enough apart to be worth flagging. */
export const hasOperationHistory = (rowCount: number, operationCount: number): boolean =>
  rowCount > 0 && operationCount > rowCount * OPERATION_HISTORY_FACTOR;

export interface OplogStats {
  name: string;
  /** Distinct rows, so a row synced through several buckets counts once. */
  rowCount: number;
  /** Operations held locally for those rows. History shows up as operations without rows. */
  operationCount: number;
  /** Bytes of row data. */
  size: number;
}

/**
 * The client's own tables. PowerSync exposes each one as a view over its internal storage, and keeps
 * its own tables under the `ps_` prefix, so the views that are left are the tables the app would query.
 */
const SYNCED_TABLE_NAMES_SQL =
  "SELECT name FROM sqlite_master WHERE type = 'view' AND name NOT LIKE 'ps_%' ORDER BY name";

/** Rows, operations and size per table, read from the operation log the way the diagnostics client does. */
const TABLE_STATS_SQL = `
  SELECT row_type AS name,
    count(DISTINCT row_id) AS rowCount,
    count() AS operationCount,
    sum(length(ifnull(data, ''))) AS size
  FROM ps_oplog
  GROUP BY row_type
  ORDER BY row_type`;

/** The same per bucket. ps_oplog holds the bucket's numeric id, which ps_buckets maps back to its name. */
const BUCKET_STATS_SQL = `
  WITH oplog AS (
    SELECT bucket,
      count(DISTINCT row_id) AS rowCount,
      count() AS operationCount,
      sum(length(ifnull(data, ''))) AS size
    FROM ps_oplog
    GROUP BY bucket
  )
  SELECT ps_buckets.name AS name,
    ifnull(oplog.rowCount, 0) AS rowCount,
    ifnull(oplog.operationCount, 0) AS operationCount,
    ifnull(oplog.size, 0) AS size
  FROM ps_buckets
  LEFT JOIN oplog ON oplog.bucket = ps_buckets.id`;

/** A number the way SQLite hands them over: possibly as text, never as NaN. */
const toNumber = (value: unknown, field: string): number => {
  const number = Number(value);
  if (Number.isNaN(number)) {
    throw new Error(`Expected a number for ${field}, got ${String(value)}`);
  }
  return number;
};

const toStats = (row: unknown): OplogStats => {
  if (!isRecord(row) || typeof row.name !== 'string') {
    throw new Error('Expected a stats row with a name');
  }
  return {
    name: row.name,
    rowCount: toNumber(row.rowCount, 'rowCount'),
    operationCount: toNumber(row.operationCount, 'operationCount'),
    size: toNumber(row.size, 'size')
  };
};

export async function readSyncedTableNames(client: QueryRunner): Promise<string[]> {
  const result = await client.runQuery({ sql: SYNCED_TABLE_NAMES_SQL });
  return result.rows.map((row) => {
    if (typeof row.name !== 'string') {
      throw new Error('Expected a view name');
    }
    return row.name;
  });
}

const readStats = async (client: QueryRunner, sql: string): Promise<OplogStats[]> => {
  const result = await client.runQuery({ sql });
  return result.rows.map(toStats);
};

export const readTableStats = (client: QueryRunner) => readStats(client, TABLE_STATS_SQL);

export const readBucketStats = (client: QueryRunner) => readStats(client, BUCKET_STATS_SQL);
