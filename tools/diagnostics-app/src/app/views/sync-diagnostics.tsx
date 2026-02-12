import { NavigationPage } from '@/components/navigation/NavigationPage';
import { NewStreamSubscription } from '@/components/widgets/NewStreamSubscription';
import { clearData, connect, connector, db, sync, useSyncStatus } from '@/library/powersync/ConnectionManager';
import { getTokenUserId, decodeTokenPayload } from '@/library/powersync/TokenConnector';
import { SyncStreamStatus } from '@powersync/web';
import React, { useState } from 'react';
import { useQuery as useTanstackQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatBytes } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ChevronDown, ChevronUp, Trash2, Info, Eye } from 'lucide-react';

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

const syncDiagnosticsKeys = {
  all: ['syncDiagnostics'] as const,
  stats: () => [...syncDiagnosticsKeys.all, 'stats'] as const
};

interface SyncStats {
  bucketRows: any[] | null;
  tableRows: any[] | null;
  lastSyncedAt: Date | null;
}

async function fetchSyncStats(): Promise<SyncStats> {
  const { synced_at } = await db.get<{ synced_at: string | null }>('SELECT powersync_last_synced_at() as synced_at');
  const lastSyncedAt = synced_at ? new Date(synced_at + 'Z') : null;

  if (synced_at != null && !sync?.syncStatus.dataFlowStatus.downloading) {
    const bucketRows = await db.getAll(BUCKETS_QUERY);
    const tableRows = await db.getAll(TABLES_QUERY);
    return { bucketRows, tableRows, lastSyncedAt };
  }
  if (synced_at != null) {
    const bucketRows = await db.getAll(BUCKETS_QUERY_FAST);
    const tableRows = await db.getAll(TABLES_QUERY);
    return { bucketRows, tableRows, lastSyncedAt };
  }
  const bucketRows = await db.getAll(BUCKETS_QUERY_FAST);
  return { bucketRows, tableRows: null, lastSyncedAt };
}

export default function SyncDiagnosticsPage() {
  const queryClient = useQueryClient();

  const [showTokenDialog, setShowTokenDialog] = useState(false);

  const { data: connectionInfo } = useTanstackQuery({
    queryKey: ['connectionInfo'],
    queryFn: async () => {
      const credentials = await connector.fetchCredentials();
      if (!credentials) return null;
      return {
        endpoint: credentials.endpoint,
        userId: getTokenUserId(credentials.token),
        token: credentials.token,
        tokenPayload: decodeTokenPayload(credentials.token)
      };
    },
    staleTime: Infinity
  });

  const { data: stats, isLoading } = useTanstackQuery({
    queryKey: syncDiagnosticsKeys.stats(),
    queryFn: fetchSyncStats,
    staleTime: 30000,
    refetchOnWindowFocus: false
  });

  React.useEffect(() => {
    const dispose = db.onChangeWithCallback(
      {
        async onChange() {
          queryClient.invalidateQueries({ queryKey: syncDiagnosticsKeys.stats() });
        }
      },
      { rawTableNames: true, tables: ['ps_oplog', 'ps_buckets', 'ps_data_local__local_bucket_data'], throttleMs: 500 }
    );
    return () => dispose?.();
  }, [queryClient]);

  const bucketRows = stats?.bucketRows ?? null;
  const tableRows = stats?.tableRows ?? null;
  const lastSyncedAt = stats?.lastSyncedAt ?? null;
  const bucketRowsLoading = isLoading && bucketRows == null;
  const tableRowsLoading = isLoading && tableRows == null;

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
    // Bucket is ready if not actively downloading OR if there are no operations to download
    // (handles edge case where bucket was removed/cleared but still has historical stats)
    const isReady = r.downloading == 0 || r.total_operations === 0;
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
      <div className="min-w-0 max-w-full overflow-x-hidden p-5 space-y-8">
        {connectionInfo && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
            {connectionInfo.endpoint && (
              <span>
                <span className="font-medium text-foreground">Service URL:</span>{' '}
                <span className="font-mono">{connectionInfo.endpoint}</span>
              </span>
            )}
            {connectionInfo.userId && (
              <span>
                <span className="font-medium text-foreground">User ID:</span>{' '}
                <span className="font-mono">{connectionInfo.userId}</span>
              </span>
            )}
            {connectionInfo.tokenPayload && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-muted-foreground"
                  onClick={() => setShowTokenDialog(true)}>
                  <Eye className="h-3.5 w-3.5" />
                  View Token
                </Button>
                <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
                  <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>JWT Token</DialogTitle>
                      <DialogDescription>The current authentication token and its decoded payload.</DialogDescription>
                    </DialogHeader>
                    <div className="overflow-auto space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-1.5">Raw Token</h4>
                        <pre className="rounded-md bg-muted p-4 text-sm font-mono whitespace-pre-wrap break-all">
                          {connectionInfo.token}
                        </pre>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-1.5">Decoded Payload</h4>
                        <pre className="rounded-md bg-muted p-4 text-sm font-mono whitespace-pre-wrap break-all">
                          {JSON.stringify(connectionInfo.tokenPayload, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        )}
        <div>
          {bucketRowsLoading ? (
            <div className="flex justify-center items-center py-10">
              <Spinner size="lg" />
            </div>
          ) : (
            totalsTable
          )}
          <div className="mt-4 flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                clearData();
              }}>
              Clear & Redownload
            </Button>
            <span className="text-sm text-muted-foreground">
              Clears all local data and re-syncs. This will also remove any manually added stream subscriptions.
            </span>
          </div>
          {totals.total_operations > totals.row_count * 3 && totals.row_count > 0 && (
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Total operations ({totals.total_operations.toLocaleString()}) significantly exceeds total rows (
                {totals.row_count.toLocaleString()}). This indicates bucket history has accumulated and compacting or
                defragmentation could reduce sync times for new clients.{' '}
                <a
                  href="https://docs.powersync.com/maintenance-ops/compacting-buckets"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground">
                  Learn about compacting
                </a>
              </AlertDescription>
            </Alert>
          )}
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
  const [unsubscribing, setUnsubscribing] = useState<string | null>(null);

  const handleUnsubscribe = async (name: string, parameters: string) => {
    const id = `${name}-${parameters}`;
    setUnsubscribing(id);
    try {
      const params = parameters === 'null' ? null : JSON.parse(parameters);
      await db.syncStream(name, params).unsubscribeAll();
      try {
        await connect();
      } catch {
        // Reconnection may fail if credentials have expired
      }
    } finally {
      setUnsubscribing(null);
    }
  };

  const columns: DataTableColumn<any>[] = [
    { field: 'name', headerName: 'Stream Name', flex: 2 },
    { field: 'parameters', headerName: 'Parameters', flex: 3, hideOnMobile: true },
    { field: 'default', headerName: 'Default', flex: 1, type: 'boolean', hideOnMobile: true },
    { field: 'active', headerName: 'Active', flex: 1, type: 'boolean' },
    { field: 'has_explicit_subscription', headerName: 'Explicit', flex: 1, type: 'boolean', hideOnMobile: true },
    { field: 'priority', headerName: 'Priority', flex: 1, type: 'number', hideOnMobile: true },
    { field: 'last_synced_at', headerName: 'Last Synced', flex: 2, type: 'dateTime', hideOnMobile: true },
    { field: 'expires', headerName: 'Eviction Time', flex: 2, type: 'dateTime', hideOnMobile: true },
    {
      field: 'actions',
      headerName: '',
      flex: 0.5,
      renderCell: ({ row }) =>
        row.has_explicit_subscription ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            disabled={unsubscribing === row.id}
            onClick={() => handleUnsubscribe(row.name, row.parameters)}
            title="Unsubscribe">
            {unsubscribing === row.id ? <Spinner size="sm" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        ) : null
    }
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
