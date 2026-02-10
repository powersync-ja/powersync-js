import React from 'react';
import { NavigationPage } from '@/components/navigation/NavigationPage';
import { useInspector } from '@/library/inspector/InspectorContext';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery as useTanstackQuery } from '@tanstack/react-query';

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

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

async function fetchDatabaseStructure(
  getAll: (sql: string, params?: any[]) => Promise<Record<string, any>[]>
): Promise<{
  tables: TableWithCount[];
  views: SchemaObject[];
  indexes: SchemaObject[];
  triggers: SchemaObject[];
}> {
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

  // Get row counts for each table
  const tablesWithCounts: TableWithCount[] = [];
  for (const table of tables) {
    let rowCount = 0;
    try {
      const result = await getAll(`SELECT count(*) as count FROM "${table.name}"`);
      rowCount = (result[0]?.count as number) ?? 0;
    } catch {
      // Table might be inaccessible (e.g., virtual tables)
    }
    tablesWithCounts.push({
      ...table,
      rowCount,
      isPowerSync: table.name.startsWith('ps_') || table.name.startsWith('ps_data_')
    });
  }

  return { tables: tablesWithCounts, views, indexes, triggers };
}

export default function InspectorOverviewPage() {
  const { database, fileInfo } = useInspector();

  const { data, isLoading } = useTanstackQuery({
    queryKey: ['inspector-structure', fileInfo?.name],
    queryFn: () => fetchDatabaseStructure(database!.getAll),
    enabled: !!database,
    staleTime: Infinity // Data doesn't change for a static file
  });

  if (isLoading || !data) {
    return (
      <NavigationPage title="Database Overview">
        <div className="flex justify-center items-center py-20">
          <Spinner size="lg" />
        </div>
      </NavigationPage>
    );
  }

  const { tables, views, indexes, triggers } = data;
  const totalRows = tables.reduce((sum, t) => sum + t.rowCount, 0);
  const hasPowerSyncTables = tables.some((t) => t.isPowerSync);

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
                    <TableHead className="text-right">Total Rows</TableHead>
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
                    <TableCell className="text-right">{totalRows.toLocaleString()}</TableCell>
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
                <div className="text-muted-foreground">Total Rows</div>
                <div className="font-medium">{totalRows.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {hasPowerSyncTables && (
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            This appears to be a PowerSync database. Tables prefixed with <code className="text-xs bg-muted px-1 py-0.5 rounded">ps_</code> are PowerSync internal tables.
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
  {
    field: 'sql',
    headerName: 'SQL Definition',
    flex: 3,
    hideOnMobile: true,
    renderCell: ({ value }) => (
      <span className="font-mono text-xs truncate block max-w-[500px]" title={value}>
        {value}
      </span>
    )
  }
];

const viewsColumns: DataTableColumn<any>[] = [
  { field: 'name', headerName: 'Name', flex: 1 },
  {
    field: 'sql',
    headerName: 'SQL Definition',
    flex: 3,
    hideOnMobile: true,
    renderCell: ({ value }) => (
      <span className="font-mono text-xs truncate block max-w-[500px]" title={value}>
        {value}
      </span>
    )
  }
];

const indexesColumns: DataTableColumn<any>[] = [
  { field: 'name', headerName: 'Name', flex: 2 },
  { field: 'table', headerName: 'Table', flex: 1 },
  {
    field: 'sql',
    headerName: 'SQL Definition',
    flex: 3,
    hideOnMobile: true,
    renderCell: ({ value }) => (
      <span className="font-mono text-xs truncate block max-w-[500px]" title={value}>
        {value}
      </span>
    )
  }
];

const triggersColumns: DataTableColumn<any>[] = [
  { field: 'name', headerName: 'Name', flex: 2 },
  { field: 'table', headerName: 'Table', flex: 1 },
  {
    field: 'sql',
    headerName: 'SQL Definition',
    flex: 3,
    hideOnMobile: true,
    renderCell: ({ value }) => (
      <span className="font-mono text-xs truncate block max-w-[500px]" title={value}>
        {value}
      </span>
    )
  }
];
