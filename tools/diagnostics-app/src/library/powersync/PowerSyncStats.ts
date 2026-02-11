export interface PowerSyncStats {
  /** Number of entries in ps_oplog (corresponds to "Total Rows" in sync diagnostics) */
  totalRows: number;
  /** Sum of data payload sizes in ps_oplog */
  dataSize: number;
  /** Sum of metadata sizes in ps_oplog */
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
 * Each internal table is queried independently so a failure in one
 * (e.g. a view referencing sync engine internals) doesn't prevent the rest.
 */
export async function fetchPowerSyncStats(getAll: GetAll, objectNames: Set<string>): Promise<PowerSyncStats | null> {
  if (!objectNames.has('ps_oplog')) {
    return null;
  }

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

    // Derive bucket count from ps_buckets if local_bucket_data wasn't available or failed
    if (bucketCount === 0 && objectNames.has('ps_buckets')) {
      try {
        const bucketsResult = await getAll(`SELECT count(*) as count FROM ps_buckets`);
        bucketCount = Number(bucketsResult[0]?.count) || 0;
      } catch {
        // ps_buckets exists but query failed
      }
    }

    return {
      totalRows: Number(oplogStats?.count) || 0,
      dataSize: Number(oplogStats?.data_size) || 0,
      metadataSize: Number(oplogStats?.metadata_size) || 0,
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
