export interface PowerSyncStats {
  /** Number of synced data rows */
  totalRows: number;
  /** Sum of data payload sizes */
  dataSize: number;
  /** Sum of metadata sizes (row_type + row_id + overhead) */
  metadataSize: number;
  /** Number of pending CRUD operations awaiting upload */
  crudCount: number;
  /** Number of synced buckets */
  bucketCount: number;
  /** Sum of downloaded_operations across all buckets */
  downloadedOps: number;
  /** Sum of total_operations across all buckets */
  totalOps: number;
  /** Sum of download_size across all buckets */
  downloadSize: number;
}

type GetAll = (sql: string, params?: any[]) => Promise<Record<string, any>[]>;

/**
 * Fetches aggregated PowerSync stats from a database.
 *
 * Works with both live PowerSync databases and static SQLite file exports.
 * In live databases, stats are read from the ps_oplog virtual table (powered
 * by the Rust extension). In static file exports the virtual table returns no
 * rows, so we fall back to counting the underlying ps_data__* storage tables.
 */
export async function fetchPowerSyncStats(getAll: GetAll, objectNames: Set<string>): Promise<PowerSyncStats | null> {
  const hasOplog = objectNames.has('ps_oplog');
  const dataTableNames = [...objectNames].filter((name) => name.startsWith('ps_data__'));

  if (!hasOplog && dataTableNames.length === 0) {
    return null;
  }

  try {
    let totalRows = 0;
    let dataSize = 0;
    let metadataSize = 0;

    // Try ps_oplog first (works in live databases with the PowerSync extension)
    if (hasOplog) {
      try {
        const oplogStats = (
          await getAll(`
          SELECT
            count(*) as count,
            sum(length(ifnull(data, ''))) as data_size,
            sum(length(row_type) + length(row_id) + length(key) + 44) as metadata_size
          FROM ps_oplog
        `)
        )[0];
        totalRows = Number(oplogStats?.count) || 0;
        dataSize = Number(oplogStats?.data_size) || 0;
        metadataSize = Number(oplogStats?.metadata_size) || 0;
      } catch {
        // ps_oplog exists but query failed (virtual table without extension)
      }
    }

    // Fallback: ps_oplog returned 0 rows (static file without the Rust extension).
    // Compute stats from the underlying ps_data__* storage tables.
    if (totalRows === 0 && dataTableNames.length > 0) {
      for (const tableName of dataTableNames) {
        try {
          const typeName = tableName.replace(/^ps_data__/, '');
          const tableInfo = await getAll(`PRAGMA table_info("${tableName}")`);
          const dataCols = tableInfo.filter((c: any) => c.name !== 'id').map((c: any) => `"${c.name}"`);

          const sizeExpr = dataCols.length > 0 ? `, sum(${dataCols.map((c) => `length(ifnull(${c}, ''))`).join(' + ')}) as data_size` : '';
          const result = await getAll(`
            SELECT
              count(*) as count
              ${sizeExpr},
              sum(length(id) + ${typeName.length} + 44) as metadata_size
            FROM "${tableName}"
          `);
          totalRows += Number(result[0]?.count) || 0;
          dataSize += Number(result[0]?.data_size) || 0;
          metadataSize += Number(result[0]?.metadata_size) || 0;
        } catch {
          // Skip tables that fail
        }
      }
    }

    let crudCount = 0;
    if (objectNames.has('ps_crud')) {
      try {
        const crudResult = await getAll(`SELECT count(*) as count FROM ps_crud`);
        crudCount = Number(crudResult[0]?.count) || 0;
      } catch {
        // ps_crud may not be queryable in static exports
      }
    }

    let bucketCount = 0;
    let downloadedOps = 0;
    let totalOps = 0;
    let downloadSize = 0;

    // local_bucket_data tracks sync engine download state. It may not be queryable
    // in static SQLite exports where the view references internal engine tables.
    if (objectNames.has('local_bucket_data')) {
      try {
        const bucketResult = await getAll(`
          SELECT
            count(*) as count,
            sum(downloaded_operations) as downloaded_ops,
            sum(total_operations) as total_ops,
            sum(download_size) as download_size
          FROM local_bucket_data
        `);
        bucketCount = Number(bucketResult[0]?.count) || 0;
        downloadedOps = Number(bucketResult[0]?.downloaded_ops) || 0;
        totalOps = Number(bucketResult[0]?.total_ops) || 0;
        downloadSize = Number(bucketResult[0]?.download_size) || 0;
      } catch {
        // View exists in schema but query failed
      }
    }

    // Derive bucket count and total ops from ps_buckets if local_bucket_data wasn't available or failed
    if (objectNames.has('ps_buckets')) {
      if (bucketCount === 0) {
        try {
          const countResult = await getAll(`SELECT count(*) as count FROM ps_buckets WHERE name != '$local'`);
          bucketCount = Number(countResult[0]?.count) || 0;
        } catch {
          // ps_buckets exists but query failed
        }
      }

      if (totalOps === 0) {
        // Try count_at_last + count_since_last first (newer SDK versions)
        try {
          const opsResult = await getAll(`
            SELECT sum(count_at_last + count_since_last) as total_ops
            FROM ps_buckets WHERE name != '$local'
          `);
          totalOps = Number(opsResult[0]?.total_ops) || 0;
        } catch {
          // Columns may not exist in older database versions
        }
      }

      if (totalOps === 0) {
        // Fallback: last_op is the checkpoint sequence number per bucket (~= total ops)
        try {
          const opIdResult = await getAll(`
            SELECT sum(cast(last_op as integer)) as total_ops
            FROM ps_buckets WHERE name != '$local'
          `);
          totalOps = Number(opIdResult[0]?.total_ops) || 0;
        } catch {
          // last_op might not be numeric
        }
      }
    }

    return {
      totalRows,
      dataSize,
      metadataSize,
      crudCount,
      bucketCount,
      downloadedOps,
      totalOps,
      downloadSize
    };
  } catch {
    return null;
  }
}
