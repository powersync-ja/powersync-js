import { NavigationPage } from '@/components/navigation/NavigationPage';
import { NewStreamSubscription } from '@/components/widgets/NewStreamSubscription';
import { clearData, db, sync, useSyncStatus } from '@/library/powersync/ConnectionManager';
import { SyncStreamStatus } from '@powersync/web';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { ChevronDown, ChevronUp } from 'lucide-react';

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
LEFT JOIN oplog_stats stats ON stats.bucket_id = ps_buckets.id`;

const TABLES_QUERY = `
SELECT row_type as name, count() as count, sum(length(data)) as size FROM ps_oplog GROUP BY row_type
`;

const BUCKETS_QUERY_FAST = `
SELECT
  local.id as name,
  '[]' as tables,
  0 as data_size,
  0 as metadata_size,
  0 as row_count,
  local.download_size,
  local.downloaded_operations,
  local.total_operations,
  local.downloading
FROM local_bucket_data local`;

export default function SyncDiagnosticsPage() {
  const [bucketRows, setBucketRows] = React.useState<null | any[]>(null);
  const [tableRows, setTableRows] = React.useState<null | any[]>(null);
  const [lastSyncedAt, setlastSyncedAt] = React.useState<Date | null>(null);

  const bucketRowsLoading = bucketRows == null;
  const tableRowsLoading = tableRows == null;

  const refreshStats = async () => {
    // Similar to db.currentState.hasSynced, but synchronized to the onChange events
    const { synced_at } = await db.get<{ synced_at: string | null }>('SELECT powersync_last_synced_at() as synced_at');
    setlastSyncedAt(synced_at ? new Date(synced_at + 'Z') : null);
    if (synced_at != null && !sync?.syncStatus.dataFlowStatus.downloading) {
      // These are potentially expensive queries - do not run during initial sync
      const bucketRows = await db.getAll(BUCKETS_QUERY);
      const tableRows = await db.getAll(TABLES_QUERY);
      setBucketRows(bucketRows);
      setTableRows(tableRows);
    } else if (synced_at != null) {
      // Busy downloading, but have already synced once
      const bucketRows = await db.getAll(BUCKETS_QUERY_FAST);
      setBucketRows(bucketRows);
      // Load tables if we haven't yet
      if (tableRows == null) {
        const tableRows = await db.getAll(TABLES_QUERY);
        setTableRows(tableRows);
      }
    } else {
      // Fast query to show progress during initial sync / while downloading bulk data
      const bucketRows = await db.getAll(BUCKETS_QUERY_FAST);
      setBucketRows(bucketRows);
      setTableRows(null);
    }
  };

  React.useEffect(() => {
    const controller = new AbortController();

    db.onChangeWithCallback(
      {
        async onChange(event) {
          await refreshStats();
        }
      },
      { rawTableNames: true, tables: ['ps_oplog', 'ps_buckets', 'ps_data_local__local_bucket_data'], throttleMs: 500 }
    );

    refreshStats();

    return () => {
      controller.abort();
    };
  }, []);

  const bucketsColumns: DataTableColumn<any>[] = [
    { field: 'name', headerName: 'Name', flex: 2 },
    {
      field: 'tables',
      headerName: 'Table(s)',
      flex: 1,
      renderCell: ({ value }) => <TruncatedTablesList tables={value} />
    },
    { field: 'row_count', headerName: 'Row Count', flex: 1, type: 'number', hideOnMobile: true },
    { field: 'downloaded_operations', headerName: 'Downloaded Ops', flex: 1, type: 'number', hideOnMobile: true },
    { field: 'total_operations', headerName: 'Total Ops', flex: 1, type: 'number' },
    {
      field: 'data_size',
      headerName: 'Data Size',
      flex: 1,
      type: 'number',
      valueFormatter: ({ value }) => formatBytes(value),
      hideOnMobile: true
    },
    {
      field: 'metadata_size',
      headerName: 'Metadata Size',
      flex: 1,
      type: 'number',
      valueFormatter: ({ value }) => formatBytes(value),
      hideOnMobile: true
    },
    {
      field: 'download_size',
      headerName: 'Downloaded Size',
      flex: 1,
      type: 'number',
      valueFormatter: ({ value }) => formatBytes(value),
      hideOnMobile: true
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1
    }
  ];

  const rows = (bucketRows ?? []).map((r) => {
    const isReady = r.downloading == 0;
    return {
      id: r.name,
      name: r.name,
      tables: JSON.parse(r.tables ?? '[]').join(', '),
      row_count: r.row_count,
      downloaded_operations: r.downloaded_operations,
      total_operations: r.total_operations,
      data_size: r.data_size,
      metadata_size: r.metadata_size,
      download_size: r.download_size,
      status: isReady ? 'Ready' : 'Downloading...'
    };
  });

  const totals = {
    buckets: rows.length,
    row_count: rows.reduce((total, row) => total + row.row_count, 0),
    downloaded_operations: rows.reduce((total, row) => total + row.downloaded_operations, 0),
    total_operations: rows.reduce((total, row) => total + row.total_operations, 0),
    data_size: rows.reduce((total, row) => total + row.data_size, 0),
    metadata_size: rows.reduce((total, row) => total + row.metadata_size, 0),
    download_size: rows.reduce((total, row) => total + row.download_size, 0)
  };

  const tablesColumns: DataTableColumn<any>[] = [
    { field: 'name', headerName: 'Name', flex: 2 },
    { field: 'count', headerName: 'Row Count', flex: 1, type: 'number' },
    {
      field: 'size',
      headerName: 'Data Size',
      flex: 1,
      type: 'number',
      valueFormatter: ({ value }) => formatBytes(value),
      hideOnMobile: true
    }
  ];

  const tablesRows = (tableRows ?? []).map((r) => {
    return {
      id: r.name,
      ...r
    };
  });

  const totalsTable = (
    <Card>
      <CardContent className="p-0">
        {/* Desktop table view */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Buckets</TableHead>
                <TableHead className="text-right">Total Rows</TableHead>
                <TableHead className="text-right">Downloaded Ops</TableHead>
                <TableHead className="text-right">Total Ops</TableHead>
                <TableHead className="text-right">Data Size</TableHead>
                <TableHead className="text-right">Metadata Size</TableHead>
                <TableHead className="text-right">Downloaded Size</TableHead>
                <TableHead className="text-right">Last Synced</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">{totals.buckets}</TableCell>
                <TableCell className="text-right">{totals.row_count.toLocaleString()}</TableCell>
                <TableCell className="text-right">{totals.downloaded_operations.toLocaleString()}</TableCell>
                <TableCell className="text-right">{totals.total_operations.toLocaleString()}</TableCell>
                <TableCell className="text-right">{formatBytes(totals.data_size)}</TableCell>
                <TableCell className="text-right">{formatBytes(totals.metadata_size)}</TableCell>
                <TableCell className="text-right">{formatBytes(totals.download_size)}</TableCell>
                <TableCell className="text-right">{lastSyncedAt?.toLocaleTimeString() ?? '-'}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        {/* Mobile grid view */}
        <div className="md:hidden p-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground">Buckets</div>
            <div className="font-medium">{totals.buckets}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Total Rows</div>
            <div className="font-medium">{totals.row_count.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Downloaded Ops</div>
            <div className="font-medium">{totals.downloaded_operations.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Total Ops</div>
            <div className="font-medium">{totals.total_operations.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Data Size</div>
            <div className="font-medium">{formatBytes(totals.data_size)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Metadata Size</div>
            <div className="font-medium">{formatBytes(totals.metadata_size)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Downloaded Size</div>
            <div className="font-medium">{formatBytes(totals.download_size)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Last Synced</div>
            <div className="font-medium">{lastSyncedAt?.toLocaleTimeString() ?? '-'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <NavigationPage title="Sync Diagnostics">
      <div className="p-5 space-y-8">
        <div>
          {bucketRowsLoading ? (
            <div className="flex justify-center items-center py-10">
              <Spinner size="lg" />
            </div>
          ) : (
            totalsTable
          )}
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                clearData();
              }}>
              Clear & Redownload
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Tables</h2>
          {tableRowsLoading ? (
            <div className="flex justify-center items-center py-10">
              <Spinner size="lg" />
            </div>
          ) : (
            <DataTable rows={tablesRows} columns={tablesColumns} pageSize={10} pageSizeOptions={[10, 50, 100]} />
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Buckets</h2>
          {bucketRowsLoading ? (
            <div className="flex justify-center items-center py-10">
              <Spinner size="lg" />
            </div>
          ) : (
            <DataTable
              rows={rows}
              columns={bucketsColumns}
              pageSize={50}
              pageSizeOptions={[10, 50, 100]}
              initialSortField="total_operations"
              initialSortDirection="desc"
            />
          )}
        </div>

        <StreamsState />
      </div>
    </NavigationPage>
  );
}

function StreamsState() {
  const syncStreams = useSyncStatus()?.syncStreams;
  const [dialogOpen, setDialogOpen] = useState(false);
  const syncStreamsLoading = syncStreams == null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Sync Stream Subscriptions</h2>
      {syncStreamsLoading ? (
        <div className="flex justify-center items-center py-10">
          <Spinner size="lg" />
        </div>
      ) : (
        <StreamsTable streams={syncStreams} />
      )}
      <NewStreamSubscription open={dialogOpen} close={() => setDialogOpen(false)} />
      <Button variant="outline" onClick={() => setDialogOpen(true)}>
        Add Subscription
      </Button>
    </div>
  );
}

function StreamsTable(props: { streams: SyncStreamStatus[] }) {
  const columns: DataTableColumn<any>[] = [
    { field: 'name', headerName: 'Stream Name', flex: 2 },
    { field: 'parameters', headerName: 'Parameters', flex: 3, hideOnMobile: true },
    { field: 'default', headerName: 'Default', flex: 1, type: 'boolean', hideOnMobile: true },
    { field: 'active', headerName: 'Active', flex: 1, type: 'boolean' },
    { field: 'has_explicit_subscription', headerName: 'Explicit', flex: 1, type: 'boolean', hideOnMobile: true },
    { field: 'priority', headerName: 'Priority', flex: 1, type: 'number', hideOnMobile: true },
    { field: 'last_synced_at', headerName: 'Last Synced', flex: 2, type: 'dateTime', hideOnMobile: true },
    { field: 'expires', headerName: 'Eviction Time', flex: 2, type: 'dateTime', hideOnMobile: true }
  ];

  const rows = props.streams.map((stream) => {
    const name = stream.subscription.name;
    const parameters = JSON.stringify(stream.subscription.parameters);

    return {
      id: `${name}-${parameters}`,
      name,
      parameters,
      default: stream.subscription.isDefault,
      has_explicit_subscription: stream.subscription.hasExplicitSubscription,
      active: stream.subscription.active,
      last_synced_at: stream.subscription.lastSyncedAt,
      expires: stream.subscription.expiresAt,
      priority: stream.priority
    };
  });

  return <DataTable rows={rows} columns={columns} pageSize={10} pageSizeOptions={[10, 50, 100]} />;
}

const MAX_VISIBLE_TABLES = 3;

function TruncatedTablesList({ tables }: { tables: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!tables) return <span className="text-muted-foreground">-</span>;

  const tableList = tables.split(', ').filter(Boolean);
  const tableCount = tableList.length;

  if (tableCount <= MAX_VISIBLE_TABLES) {
    return <span>{tables}</span>;
  }

  const visibleTables = expanded ? tableList : tableList.slice(0, MAX_VISIBLE_TABLES);
  const hiddenCount = tableCount - MAX_VISIBLE_TABLES;

  return (
    <div className="flex flex-col gap-1">
      <span>{visibleTables.join(', ')}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        {expanded ? (
          <>
            <ChevronUp className="h-3 w-3" />
            Show less
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3" />
            +{hiddenCount} more
          </>
        )}
      </button>
    </div>
  );
}

// Source: https://stackoverflow.com/a/18650828/214837
function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
