import React from 'react';
import { NavigationPage } from '@/components/navigation/NavigationPage';
import { useInspector } from '@/library/inspector/InspectorContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery as useTanstackQuery } from '@tanstack/react-query';
import { AlertTriangle, Info, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatBytes } from '@/lib/utils';
import { fetchPowerSyncStats, type PowerSyncStats } from '@/library/powersync/PowerSyncStats';

interface SchemaObject {
  type: string;
  name: string;
  tbl_name: string;
  sql: string | null;
}

interface TableWithCount extends SchemaObject {
  rowCount: number;
  isPowerSync: boolean;
}

interface DatabaseStructure {
  tables: TableWithCount[];
  views: SchemaObject[];
  indexes: SchemaObject[];
  triggers: SchemaObject[];
  powerSyncStats: PowerSyncStats | null;
}

/** Wraps a getAll executor with a per-query timeout. If a query hangs (e.g. virtual tables
 *  without the native extension), it rejects instead of blocking forever. */
function withQueryTimeout(
  getAll: (sql: string, params?: any[]) => Promise<Record<string, any>[]>,
  timeoutMs = 5000
): (sql: string, params?: any[]) => Promise<Record<string, any>[]> {
  return (sql, params) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Query timed out after ${timeoutMs}ms`)), timeoutMs);
      getAll(sql, params).then(
        (result) => { clearTimeout(timer); resolve(result); },
        (err) => { clearTimeout(timer); reject(err); }
      );
    });
  };
}

async function fetchDatabaseStructure(
  rawGetAll: (sql: string, params?: any[]) => Promise<Record<string, any>[]>
): Promise<DatabaseStructure> {
  const getAll = withQueryTimeout(rawGetAll);
  const objects = (await getAll(
    `SELECT type, name, tbl_name, sql FROM sqlite_master ORDER BY type, name`
  )) as SchemaObject[];

  const tables: SchemaObject[] = [];
  const views: SchemaObject[] = [];
  const indexes: SchemaObject[] = [];
  const triggers: SchemaObject[] = [];

  for (const obj of objects) {
    switch (obj.type) {
      case 'table':
        tables.push(obj);
        break;
      case 'view':
        views.push(obj);
        break;
      case 'index':
        indexes.push(obj);
        break;
      case 'trigger':
        triggers.push(obj);
        break;
    }
  }

  const tablesWithCounts: TableWithCount[] = [];
  for (const table of tables) {
    let rowCount = 0;
    try {
      const result = await getAll(`SELECT count(*) as count FROM "${table.name}"`);
      rowCount = (result[0]?.count as number) ?? 0;
    } catch {
      // Table might be inaccessible (e.g. virtual tables)
    }
    tablesWithCounts.push({
      ...table,
      rowCount,
      isPowerSync: table.name.startsWith('ps_') || table.name.startsWith('ps_data_')
    });
  }

  // Include both tables and views since some PowerSync objects (e.g. local_bucket_data) may be views
  const allObjectNames = new Set([...tablesWithCounts.map((t) => t.name), ...views.map((v) => v.name)]);
  const powerSyncStats = await fetchPowerSyncStats(getAll, allObjectNames);

  return { tables: tablesWithCounts, views, indexes, triggers, powerSyncStats };
}

export default function InspectorOverviewPage() {
  const { database, fileInfo } = useInspector();

  const { data, isLoading, error } = useTanstackQuery({
    queryKey: ['inspector-structure', fileInfo?.name],
    queryFn: () => fetchDatabaseStructure(database!.getAll),
    enabled: !!database,
    staleTime: Infinity,
    retry: false
  });

  if (isLoading) {
    return (
      <NavigationPage title="Database Overview">
        <div className="flex justify-center items-center py-20">
          <Spinner size="lg" />
        </div>
      </NavigationPage>
    );
  }

  if (error || !data) {
    return (
      <NavigationPage title="Database Overview">
        <div className="p-5">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to read database structure: {error?.message || 'Unknown error'}
            </AlertDescription>
          </Alert>
        </div>
      </NavigationPage>
    );
  }

  const { tables, views, indexes, triggers, powerSyncStats } = data;
  const totalTableRows = tables.reduce((sum, t) => sum + t.rowCount, 0);
  const hasPowerSyncTables = tables.some((t) => t.isPowerSync);
  const hasSyncEngineDownloadStats =
    powerSyncStats != null && (powerSyncStats.downloadedOps > 0 || powerSyncStats.downloadSize > 0);

  return (
    <NavigationPage title="Database Overview">
      <div className="min-w-0 max-w-full overflow-x-hidden p-5 space-y-8">
        {/* File Stats */}
        <Card>
          <CardContent className="p-0">
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead className="text-right">File Size</TableHead>
                    <TableHead className="text-right">Last Modified</TableHead>
                    <TableHead className="text-right">Tables</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Indexes</TableHead>
                    <TableHead className="text-right">All Table Rows</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium font-mono">{fileInfo?.name ?? '-'}</TableCell>
                    <TableCell className="text-right">{fileInfo ? formatBytes(fileInfo.size) : '-'}</TableCell>
                    <TableCell className="text-right">
                      {fileInfo ? fileInfo.lastModified.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">{tables.length}</TableCell>
                    <TableCell className="text-right">{views.length}</TableCell>
                    <TableCell className="text-right">{indexes.length}</TableCell>
                    <TableCell className="text-right">{totalTableRows.toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            {/* Mobile grid */}
            <div className="md:hidden p-4 grid grid-cols-2 gap-3 text-sm">
              <div className="col-span-2">
                <div className="text-muted-foreground">File Name</div>
                <div className="font-medium font-mono truncate">{fileInfo?.name ?? '-'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">File Size</div>
                <div className="font-medium">{fileInfo ? formatBytes(fileInfo.size) : '-'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Last Modified</div>
                <div className="font-medium">{fileInfo ? fileInfo.lastModified.toLocaleString() : '-'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Tables</div>
                <div className="font-medium">{tables.length}</div>
              </div>
              <div>
                <div className="text-muted-foreground">All Table Rows</div>
                <div className="font-medium">{totalTableRows.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {hasPowerSyncTables && (
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            This appears to be a PowerSync database. Tables prefixed with{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">ps_</code> are PowerSync internal tables.
          </div>
        )}

        {powerSyncStats && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">PowerSync Stats</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <StatCard label="Buckets" value={powerSyncStats.bucketCount.toLocaleString()} tooltip="Number of sync buckets defined by your sync rules" />
              <StatCard label="Total Rows" value={powerSyncStats.totalRows.toLocaleString()} tooltip="Total synced data rows across all ps_data__ tables" />
              <StatCard label="Total Ops" value={powerSyncStats.totalOps.toLocaleString()} tooltip="Total sync operations processed. When this significantly exceeds total rows, compacting may help." />
              <StatCard label="Data Size" value={formatBytes(powerSyncStats.dataSize)} tooltip="Sum of all column data sizes across synced rows" />
              <StatCard label="Metadata Size" value={formatBytes(powerSyncStats.metadataSize)} tooltip="Estimated size of row metadata (type, id, and key overhead)" />
              <StatCard
                label="CRUD Queue"
                value={powerSyncStats.crudCount.toLocaleString()}
                warning={powerSyncStats.crudCount > 0}
                tooltip="Pending local write operations waiting to be uploaded to the backend"
              />
              {hasSyncEngineDownloadStats && (
                <>
                  <StatCard label="Downloaded Ops" value={powerSyncStats.downloadedOps.toLocaleString()} tooltip="Number of operations downloaded from the PowerSync service" />
                  <StatCard label="Download Size" value={formatBytes(powerSyncStats.downloadSize)} tooltip="Total bytes downloaded from the PowerSync service" />
                </>
              )}
            </div>
            {powerSyncStats.crudCount > 0 && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  The CRUD queue contains {powerSyncStats.crudCount.toLocaleString()} pending{' '}
                  {powerSyncStats.crudCount === 1 ? 'operation' : 'operations'} that likely failed to upload to the
                  backend. This may indicate an issue with the upload implementation or backend connectivity at the time
                  the database was captured.
                </AlertDescription>
              </Alert>
            )}
            {powerSyncStats.totalOps > powerSyncStats.totalRows * 3 && powerSyncStats.totalRows > 0 && (
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Total operations ({powerSyncStats.totalOps.toLocaleString()}) significantly exceeds total rows (
                  {powerSyncStats.totalRows.toLocaleString()}). This indicates bucket history has accumulated and
                  compacting or defragmentation could reduce sync times for new clients.{' '}
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
        )}

        {/* Tables */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Tables ({tables.length})</h2>
          <DataTable
            rows={tables.map((t) => ({
              id: t.name,
              name: t.name,
              rowCount: t.rowCount,
              isPowerSync: t.isPowerSync,
              sql: t.sql ?? '-'
            }))}
            columns={tablesColumns}
            pageSize={20}
            pageSizeOptions={[10, 20, 50, 100]}
            initialSortField="rowCount"
            initialSortDirection="desc"
          />
        </div>

        {/* Views */}
        {views.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Views ({views.length})</h2>
            <DataTable
              rows={views.map((v) => ({
                id: v.name,
                name: v.name,
                sql: v.sql ?? '-'
              }))}
              columns={viewsColumns}
              pageSize={10}
              pageSizeOptions={[10, 20, 50]}
            />
          </div>
        )}

        {/* Indexes */}
        {indexes.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Indexes ({indexes.length})</h2>
            <DataTable
              rows={indexes.map((idx) => ({
                id: idx.name,
                name: idx.name,
                table: idx.tbl_name,
                sql: idx.sql ?? '(auto-generated)'
              }))}
              columns={indexesColumns}
              pageSize={10}
              pageSizeOptions={[10, 20, 50]}
            />
          </div>
        )}

        {/* Triggers */}
        {triggers.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Triggers ({triggers.length})</h2>
            <DataTable
              rows={triggers.map((tr) => ({
                id: tr.name,
                name: tr.name,
                table: tr.tbl_name,
                sql: tr.sql ?? '-'
              }))}
              columns={triggersColumns}
              pageSize={10}
              pageSizeOptions={[10, 20, 50]}
            />
          </div>
        )}
      </div>
    </NavigationPage>
  );
}

function StatCard({ label, value, warning, tooltip }: { label: string; value: string; warning?: boolean; tooltip?: string }) {
  return (
    <Card className={warning ? 'border-amber-500/50' : undefined}>
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground flex items-center gap-1.5">
          {label}
          {warning && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
          {tooltip && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

const sqlCellRenderer = ({ value }: { value: string }) => (
  <span className="font-mono text-xs truncate block max-w-[500px]" title={value}>
    {value}
  </span>
);

const tablesColumns: DataTableColumn<any>[] = [
  {
    field: 'name',
    headerName: 'Name',
    flex: 2,
    renderCell: ({ value, row }) => (
      <span>
        {value}
        {row.isPowerSync && (
          <span className="ml-2 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">internal</span>
        )}
      </span>
    )
  },
  { field: 'rowCount', headerName: 'Row Count', flex: 1, type: 'number' },
  { field: 'sql', headerName: 'SQL Definition', flex: 3, hideOnMobile: true, renderCell: sqlCellRenderer }
];

const viewsColumns: DataTableColumn<any>[] = [
  { field: 'name', headerName: 'Name', flex: 1 },
  { field: 'sql', headerName: 'SQL Definition', flex: 3, hideOnMobile: true, renderCell: sqlCellRenderer }
];

const indexesColumns: DataTableColumn<any>[] = [
  { field: 'name', headerName: 'Name', flex: 2 },
  { field: 'table', headerName: 'Table', flex: 1 },
  { field: 'sql', headerName: 'SQL Definition', flex: 3, hideOnMobile: true, renderCell: sqlCellRenderer }
];

const triggersColumns: DataTableColumn<any>[] = [
  { field: 'name', headerName: 'Name', flex: 2 },
  { field: 'table', headerName: 'Table', flex: 1 },
  { field: 'sql', headerName: 'SQL Definition', flex: 3, hideOnMobile: true, renderCell: sqlCellRenderer }
];
