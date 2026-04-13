import { NavigationPage } from '@/components/navigation/NavigationPage';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NewStreamSubscription } from '@/components/widgets/NewStreamSubscription';
import { StreamsTable } from '@/components/widgets/StreamsTable';
import { cn, formatBytes } from '@/lib/utils';
import { clearData, connector, db, sync, useSyncStatus } from '@/library/powersync/ConnectionManager';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { decodeTokenPayload, getTokenUserId } from '@/library/powersync/TokenConnector';
import { useQueryClient, useQuery as useTanstackQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Eye, Info } from 'lucide-react';
import React, { useState } from 'react';

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

/**
 * Groups ps_oplog entries by row_type (table/view name) to get the list
 * of tables and their total data sizes.
 * - row_count: number of unique row_id values per row_type (actual row count, robust across multiple buckets/keys)
 * - synced_count: This is not quite number of ops since they're de-duplicated per key already, but it counts the number of times the same row is synced via different buckets or different keys.
 */
const TABLES_SIZE_QUERY = /* sql */ `
  SELECT
    row_type as name,
    count(distinct row_id) as count,
    count() as synced_count,
    sum(length (data)) as size
  FROM
    ps_oplog
  GROUP BY
    row_type
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

/** When total_operations exceeds row_count by this factor, we show a warning that bucket history has accumulated and compacting may help. This is an abritrary threshold and indicates significant history buildup.*/
const BUCKET_HISTORY_THRESHOLD = 3;

/**
 * Default server-side limit for both the "too many buckets" and "too many parameter query results"
 * limits (both reported as error PSYNC_S2305). These are two distinct limits that often coincide
 * but can differ:
 * - Duplicate parameter query results count individually toward the parameter result limit,
 *   but are de-duplicated in the bucket count.
 * - Non-partitioning queries count 1 toward the bucket limit but not toward the parameter result limit.
 * The default is 1000 but can be configured on the server.
 */
const DEFAULT_SYNC_LIMIT = 1000;

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
    const tableRows = await db.getAll(TABLES_SIZE_QUERY);
    return { bucketRows, tableRows, lastSyncedAt };
  }
  if (synced_at != null) {
    const bucketRows = await db.getAll(BUCKETS_QUERY_FAST);
    const tableRows = await db.getAll(TABLES_SIZE_QUERY);
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
    staleTime: 0,
    refetchOnMount: 'always'
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
    parameterized_buckets: rows.filter((row) => !row.name.endsWith('[]')).length,
    row_count: rows.reduce((total, row) => total + row.row_count, 0),
    downloaded_operations: rows.reduce((total, row) => total + row.downloaded_operations, 0),
    total_operations: rows.reduce((total, row) => total + row.total_operations, 0),
    data_size: rows.reduce((total, row) => total + row.data_size, 0),
    metadata_size: rows.reduce((total, row) => total + row.metadata_size, 0),
    download_size: rows.reduce((total, row) => total + row.download_size, 0)
  };

  const tablesColumns: DataTableColumn<any>[] = [
    { field: 'name', headerName: 'Name', flex: 2 },
    {
      field: 'count',
      headerName: 'Row Count',
      flex: 1,
      type: 'number',
      tooltip: 'Number of unique rows synced to this database.'
    },
    {
      field: 'synced_count',
      headerName: 'Synced Count',
      flex: 1,
      type: 'number',
      hideOnMobile: true,
      tooltip: 'Total number of rows synced via different buckets or different replication keys.'
    },
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
                <TableHead>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1 cursor-default">
                          Buckets
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-92">
                        Two separate limits apply (both PSYNC_S2305, default {DEFAULT_SYNC_LIMIT.toLocaleString()}{' '}
                        each): <strong>bucket count</strong> and <strong>parameter query results</strong>.
                        <div className="mt-2">
                          Global buckets count only toward bucket count. Parameter query buckets (in either{' '}
                          <a
                            href="https://docs.powersync.com/sync/rules/parameter-queries"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-foreground"
                          >
                            Sync Rules
                          </a>{' '}
                          or{' '}
                          <a
                            href="https://docs.powersync.com/sync/streams/parameters"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-foreground"
                          >
                            Sync Streams
                          </a>
                          ) count toward both, but are de-duplicated client-side, so the server's parameter result count
                          may be higher.
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
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
                <TableCell className="font-medium">
                  <span
                    className={cn(
                      totals.buckets >= 900 ? 'text-destructive' : totals.buckets >= 800 ? 'text-amber-600' : ''
                    )}
                  >
                    {totals.buckets.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground text-xs ml-1">
                    / {DEFAULT_SYNC_LIMIT.toLocaleString()} (default)
                  </span>
                  <div className="text-muted-foreground text-xs font-normal mt-0.5">
                    {totals.parameterized_buckets.toLocaleString()} parameterized,{' '}
                    {(totals.buckets - totals.parameterized_buckets).toLocaleString()} global
                  </div>
                </TableCell>
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
            <div className="font-medium">
              <span
                className={cn(
                  totals.buckets >= 900 ? 'text-destructive' : totals.buckets >= 800 ? 'text-amber-600' : ''
                )}
              >
                {totals.buckets.toLocaleString()}
              </span>
              <span className="text-muted-foreground text-xs ml-1">
                / {DEFAULT_SYNC_LIMIT.toLocaleString()} (default)
              </span>
              <div className="text-muted-foreground text-xs font-normal mt-0.5">
                {totals.parameterized_buckets.toLocaleString()} parameterized,{' '}
                {(totals.buckets - totals.parameterized_buckets).toLocaleString()} global
              </div>
            </div>
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
                  onClick={() => setShowTokenDialog(true)}
                >
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
              }}
            >
              Clear & Redownload
            </Button>
            <span className="text-sm text-muted-foreground">
              Clears all local data and re-syncs. This will also remove any manually added stream subscriptions.
            </span>
          </div>
          {totals.total_operations > totals.row_count * BUCKET_HISTORY_THRESHOLD && totals.row_count > 0 && (
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Total operations ({totals.total_operations.toLocaleString()}) significantly exceeds total rows (
                {totals.row_count.toLocaleString()}). This indicates bucket history has accumulated which negatively
                affects sync times for new clients. Performing a Compact or Defragment operation on your instance, could
                improve this.{' '}
                <a
                  href="https://docs.powersync.com/maintenance-ops/compacting-buckets"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  Learn about compacting
                </a>
              </AlertDescription>
            </Alert>
          )}
          {totals.buckets >= 2 && (
            <Alert className={cn('mt-4', totals.buckets >= 900 ? 'border-destructive/50' : 'border-amber-500/50')}>
              <Info className={cn('h-4 w-4', totals.buckets >= 900 ? 'text-destructive' : 'text-amber-600')} />
              <AlertDescription>
                <span className={cn('font-medium', totals.buckets >= 900 ? 'text-destructive' : 'text-amber-600')}>
                  {totals.buckets >= 900 ? 'Critical: ' : 'Warning: '}
                </span>
                {totals.buckets.toLocaleString()} of {DEFAULT_SYNC_LIMIT.toLocaleString()} buckets used (PSYNC_S2305,
                default limit). {totals.parameterized_buckets.toLocaleString()} are parameterized - at least that many
                parameter query results on the server. Review your Sync Config to reduce buckets and parameter query
                results for this user.{' '}
                <a
                  href="https://docs.powersync.com/debugging/troubleshooting#too-many-buckets-psync_s2305"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  For troubleshooting steps, see the docs
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
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? (
          <>
            <ChevronUp className="h-3 w-3" />
            Show less
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3" />+{hiddenCount} more
          </>
        )}
      </button>
    </div>
  );
}
