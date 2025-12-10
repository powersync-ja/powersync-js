import { usePowerSync, useStatus } from '@powersync/vue'
import type {
  PowerSyncBackendConnector,
  PowerSyncConnectionOptions,
  UploadQueueStats,
} from '@powersync/web'
import { ref, computed, readonly, onMounted, onUnmounted } from 'vue'
import { computedAsync } from '@vueuse/core'
import { usePowerSyncInspector } from './usePowerSyncInspector'

type JSONValue
  = | string
    | number
    | boolean
    | null
    | undefined
    | JSONObject
    | JSONArray
interface JSONObject {
  [key: string]: JSONValue
}
type JSONArray = JSONValue[]

// queries
const BUCKETS_QUERY = `
WITH
  oplog_by_table AS
    (SELECT
      bucket,
      row_type,
      sum(length(ifnull(data, ''))) as data_size,
      sum(length(row_type) + length(row_id) + length(key) + 44) as metadata_size,
      count() as row_count
    FROM ps_oplog
    GROUP BY bucket, row_type),

  oplog_stats AS
    (SELECT
      bucket as bucket_id,
      sum(data_size) as data_size,
      sum(metadata_size) as metadata_size,
      sum(row_count) as row_count,
      json_group_array(row_type) tables
    FROM oplog_by_table
    GROUP BY bucket)

SELECT
  local.id as name,
  ps_buckets.id as id,
  stats.tables,
  stats.data_size,
  stats.metadata_size,
  IFNULL(stats.row_count, 0) as row_count,
  local.download_size,
  local.downloaded_operations,
  local.total_operations,
  local.downloading
FROM local_bucket_data local
LEFT JOIN ps_buckets ON ps_buckets.name = local.id
LEFT JOIN oplog_stats stats ON stats.bucket_id = ps_buckets.id`

const BUCKETS_QUERY_FAST = `
SELECT
  local.id as name,
  ps_buckets.id as id,
  '[]' as tables,
  0 as data_size,
  0 as metadata_size,
  0 as row_count,
  local.download_size,
  local.downloaded_operations,
  local.total_operations,
  local.downloading
FROM local_bucket_data local
LEFT JOIN ps_buckets ON ps_buckets.name = local.id`

const TABLES_QUERY = `
SELECT row_type as name, count() as count, sum(length(data)) as size FROM ps_oplog GROUP BY row_type
`

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = [
    'Bytes',
    'KiB',
    'MiB',
    'GiB',
    'TiB',
    'PiB',
    'EiB',
    'ZiB',
    'YiB',
  ]

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${
    sizes[i]
  }`
}

export function usePowerSyncInspectorDiagnostics() {
  const db = usePowerSync()

  const syncStatus = useStatus()
  const { getCurrentSchemaManager } = usePowerSyncInspector()

  // reactive state
  const isDiagnosticSchemaSetup = ref(true)
  const connectionOptions = computed(() => db.value.connectionOptions || null)
  const connector = computed(() => db.value.connector || null)
  const hasSynced = ref(syncStatus.value?.hasSynced || false)
  const isConnected = ref(syncStatus.value?.connected || false)
  const isSyncing = ref(false)
  const isDownloading = ref(
    syncStatus.value?.dataFlowStatus.downloading || false,
  )
  const isUploading = ref(syncStatus.value?.dataFlowStatus.uploading || false)
  const lastSyncedAt = ref<Date | null>(syncStatus.value?.lastSyncedAt || null)
  const uploadError = ref(syncStatus.value?.dataFlowStatus.uploadError || null)
  const downloadError = ref(
    syncStatus.value?.dataFlowStatus.downloadError || null,
  )
  const downloadProgressDetails = ref(
    syncStatus.value?.dataFlowStatus.downloadProgress || null,
  )
  const bucketRows = ref<null | any[]>(null)
  const tableRows = ref<null | any[]>(null)

  const uploadQueueStats = ref<null | UploadQueueStats>(null)

  // computed state
  const totals = computed(() => ({
    buckets: bucketRows.value?.length ?? 0,
    row_count:
      bucketRows.value?.reduce((total, row) => total + row.row_count, 0) ?? 0,
    downloaded_operations: bucketRows.value?.reduce(
      (total, row) => total + row.downloaded_operations,
      0,
    ),
    total_operations:
      bucketRows.value?.reduce(
        (total, row) => total + row.total_operations,
        0,
      ) ?? 0,
    data_size: formatBytes(
      bucketRows.value?.reduce((total, row) => total + row.data_size, 0) ?? 0,
    ),
    metadata_size: formatBytes(
      bucketRows.value?.reduce((total, row) => total + row.metadata_size, 0)
      ?? 0,
    ),
    download_size: formatBytes(
      bucketRows.value?.reduce((total, row) => total + row.download_size, 0)
      ?? 0,
    ),
  }))

  const userID = computedAsync(async () => {
    try {
      // @ts-expect-error - connector to be double ref or something
      const token = (await connector.value.fetchCredentials())?.token

      if (!token) return null

      const [_head, body, _signature] = token.split('.')
      const payload = JSON.parse(atob(body ?? ''))
      return payload.sub
    }
    catch {
      return null
    }
  })

  const totalDownloadProgress = computed(() => {
    if (!hasSynced.value || isSyncing.value) {
      return (
        (syncStatus.value?.downloadProgress?.downloadedFraction ?? 0) * 100
      ).toFixed(1)
    }
    return 100
  })

  const uploadQueueSize = computed(() =>
    formatBytes(uploadQueueStats.value?.size ?? 0),
  )
  const uploadQueueCount = computed(() => uploadQueueStats.value?.count ?? 0)

  // functions
  const clearData = async () => {
    await db.value?.syncStreamImplementation?.disconnect()
    const connector = db.value.connector as PowerSyncBackendConnector
    const connectionOptions = db.value.connectionOptions as PowerSyncConnectionOptions
    await db.value?.disconnectAndClear()
    const schemaManager = getCurrentSchemaManager()
    await schemaManager.clear()
    await schemaManager.refreshSchema(db.value.database)
    await db.value.connect(
      connector,
      connectionOptions,
    )
  }

  async function refreshState() {
    if (db.value) {
      const { synced_at } = await db.value.get<{ synced_at: string | null }>(
        'SELECT powersync_last_synced_at() as synced_at',
      )

      uploadQueueStats.value = await db.value?.getUploadQueueStats(true)

      if (synced_at != null && !syncStatus.value?.dataFlowStatus.downloading) {
        // These are potentially expensive queries - do not run during initial sync
        bucketRows.value = await db.value.getAll(BUCKETS_QUERY)
        tableRows.value = await db.value.getAll(TABLES_QUERY)
      }
      else if (synced_at != null) {
        // Busy downloading, but have already synced once
        bucketRows.value = await db.value.getAll(BUCKETS_QUERY_FAST)
        // Load tables if we haven't yet
        if (tableRows.value == null) {
          tableRows.value = await db.value.getAll(TABLES_QUERY)
        }
      }
      else {
        // Fast query to show progress during initial sync / while downloading bulk data
        bucketRows.value = await db.value.getAll(BUCKETS_QUERY_FAST)
        tableRows.value = null
      }
    }
  }

  // Register PowerSync status listener for proper sync monitoring
  onMounted(async () => {
    if (!db.value) return

    // Register listener for PowerSync status changes
    const unregisterListener = db.value.registerListener({
      statusChanged: (newStatus) => {
        // Update reactive status
        hasSynced.value = !!newStatus.hasSynced
        isConnected.value = !!newStatus.connected
        isDownloading.value = !!newStatus.dataFlowStatus.downloading
        isUploading.value = !!newStatus.dataFlowStatus.uploading
        lastSyncedAt.value = newStatus.lastSyncedAt || null
        uploadError.value = newStatus.dataFlowStatus.uploadError || null
        downloadError.value = newStatus.dataFlowStatus.downloadError || null
        downloadProgressDetails.value
          = newStatus.dataFlowStatus.downloadProgress || null

        if (
          newStatus?.hasSynced === undefined
          || (newStatus?.priorityStatusEntries?.length
            && newStatus.priorityStatusEntries.length > 0)
        ) {
          hasSynced.value
            = newStatus?.priorityStatusEntries.every(
              entry => entry.hasSynced,
            ) ?? false
        }

        if (
          newStatus?.dataFlowStatus.downloading
          || newStatus?.dataFlowStatus.uploading
        ) {
          isSyncing.value = true
        }
        else {
          isSyncing.value = false
        }
      },
    })

    db.value!.onChangeWithCallback(
      {
        async onChange(_event) {
          await refreshState()
        },
      },
      {
        rawTableNames: true,
        tables: [
          'ps_oplog',
          'ps_buckets',
          'ps_data_local__local_bucket_data',
          'ps_crud',
        ],
        throttleMs: 500,
      },
    )

    try {
      await refreshState()
    }
    catch (error: any) {
      if (error.message === 'no such table: local_bucket_data') {
        isDiagnosticSchemaSetup.value = false
      }
    }

    // Clean up listener on unmount
    onUnmounted(() => {
      unregisterListener()
    })
  })

  // exposed state
  return {
    db,
    connector,
    connectionOptions,
    isDiagnosticSchemaSetup: readonly(isDiagnosticSchemaSetup),
    syncStatus: readonly(syncStatus),
    hasSynced: readonly(hasSynced),
    isConnected: readonly(isConnected),
    isSyncing: readonly(isSyncing),
    isDownloading: readonly(isDownloading),
    isUploading: readonly(isUploading),
    downloadError: readonly(downloadError),
    uploadError: readonly(uploadError),
    downloadProgressDetails: readonly(downloadProgressDetails),
    lastSyncedAt: readonly(lastSyncedAt),
    totalDownloadProgress: readonly(totalDownloadProgress),
    uploadQueueStats: readonly(uploadQueueStats),
    uploadQueueCount: readonly(uploadQueueCount),
    uploadQueueSize: readonly(uploadQueueSize),
    userID: readonly(userID),
    bucketRows: readonly(bucketRows),
    tableRows: readonly(tableRows),
    totals: readonly(totals),
    clearData,
    formatBytes,
  }
}
