import { NavigationPage } from '@/components/navigation/NavigationPage';
import { clearData, db, syncErrorTracker } from '@/library/powersync/ConnectionManager';
import {
  Box,
  Button,
  CircularProgress,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
  styled
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import React from 'react';

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
  local.total_operations,
  local.downloading
FROM local_bucket_data local`;

export default function SyncDiagnosticsPage() {
  const [bucketRows, setBucketRows] = React.useState<null | any[]>(null);
  const [tableRows, setTableRows] = React.useState<null | any[]>(null);
  const [syncError, setSyncError] = React.useState<Error | null>(syncErrorTracker.lastSyncError);
  const [lastSyncedAt, setlastSyncedAt] = React.useState<Date | null>(null);

  const bucketRowsLoading = bucketRows == null;
  const tableRowsLoading = tableRows == null;

  const refreshStats = async () => {
    // Similar to db.currentState.hasSynced, but synchronized to the onChange events
    const { synced_at } = await db.get<{ synced_at: string | null }>('SELECT powersync_last_synced_at() as synced_at');
    setlastSyncedAt(synced_at ? new Date(synced_at + 'Z') : null);
    if (synced_at != null) {
      // These are potentially expensive queries - do not run during initial sync
      const bucketRows = await db.getAll(BUCKETS_QUERY);
      const tableRows = await db.getAll(TABLES_QUERY);
      setBucketRows(bucketRows);
      setTableRows(tableRows);
    } else {
      // Fast query to show progress during initial sync
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

  React.useEffect(() => {
    const l = syncErrorTracker.registerListener({
      lastErrorUpdated(error) {
        setSyncError(error);
      }
    });
    return () => l();
  }, []);

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 2 },
    { field: 'tables', headerName: 'Table(s)', flex: 1, type: 'text' },
    { field: 'row_count', headerName: 'Row Count', flex: 1, type: 'number' },
    { field: 'total_operations', headerName: 'Total Operations', flex: 1, type: 'number' },
    {
      field: 'data_size',
      headerName: 'Data Size',
      flex: 1,
      type: 'number',
      valueFormatter: (v) => formatBytes(v.value)
    },
    {
      field: 'metadata_size',
      headerName: 'Metadata Size',
      flex: 1,
      type: 'number',
      valueFormatter: (v) => formatBytes(v.value)
    },
    {
      field: 'download_size',
      headerName: 'Downloaded Size',
      flex: 1,
      type: 'number',
      valueFormatter: (v) => formatBytes(v.value)
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      type: 'text'
    }
  ];

  const rows = (bucketRows ?? []).map((r) => {
    return {
      id: r.name,
      name: r.name,
      tables: JSON.parse(r.tables ?? '[]').join(', '),
      row_count: r.row_count,
      total_operations: r.total_operations,
      data_size: r.data_size,
      metadata_size: r.metadata_size,
      download_size: r.download_size,
      status: r.downloading == 0 ? 'Ready' : 'Downloading...'
    };
  });

  const totals = {
    buckets: rows.length,
    row_count: rows.reduce((total, row) => total + row.row_count, 0),
    total_operations: rows.reduce((total, row) => total + row.total_operations, 0),
    data_size: rows.reduce((total, row) => total + row.data_size, 0),
    metadata_size: rows.reduce((total, row) => total + row.metadata_size, 0),
    download_size: rows.reduce((total, row) => total + row.download_size, 0)
  };

  const tablesColumns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 2 },
    { field: 'count', headerName: 'Row Count', flex: 1 },
    {
      field: 'size',
      headerName: 'Data Size',
      flex: 1,
      type: 'number',
      valueFormatter: (v) => formatBytes(v.value)
    }
  ];

  const tablesRows = (tableRows ?? []).map((r) => {
    return {
      id: r.name,
      ...r
    };
  });

  const totalsTable = (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }}>
        <TableBody>
          <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
            <TableCell component="th" scope="row">
              Number of buckets
            </TableCell>
            <TableCell component="th">Total Rows</TableCell>
            <TableCell component="th">Total Operations</TableCell>
            <TableCell component="th">Total Data Size</TableCell>
            <TableCell component="th">Total Metadata Size</TableCell>
            <TableCell component="th">Total Downloaded Size</TableCell>
            <TableCell component="th">Last Synced At</TableCell>
          </TableRow>
          <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
            <TableCell align="right">{totals.buckets}</TableCell>
            <TableCell align="right">{totals.row_count}</TableCell>
            <TableCell align="right">{totals.total_operations}</TableCell>
            <TableCell align="right">{formatBytes(totals.data_size)}</TableCell>
            <TableCell align="right">{formatBytes(totals.metadata_size)}</TableCell>
            <TableCell align="right">{formatBytes(totals.download_size)}</TableCell>
            <TableCell align="right">{lastSyncedAt?.toLocaleTimeString()}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );

  const tablesTable = (
    <DataGrid
      autoHeight={true}
      rows={tablesRows}
      columns={tablesColumns}
      initialState={{
        pagination: {
          paginationModel: {
            pageSize: 10
          }
        }
      }}
      pageSizeOptions={[10, 50, 100]}
      disableRowSelectionOnClick
    />
  );

  const bucketsTable = (
    <DataGrid
      autoHeight={true}
      rows={rows}
      columns={columns}
      initialState={{
        pagination: {
          paginationModel: {
            pageSize: 50
          }
        },
        sorting: {
          sortModel: [{ field: 'total_operations', sort: 'desc' }]
        }
      }}
      pageSizeOptions={[10, 50, 100]}
      disableRowSelectionOnClick
    />
  );

  return (
    <NavigationPage title="Sync Diagnostics">
      <S.MainContainer>
        {bucketRowsLoading ? <CircularProgress /> : totalsTable}
        <Button
          sx={{ margin: '10px' }}
          variant="contained"
          onClick={() => {
            clearData();
          }}>
          Clear & Redownload
        </Button>
        <S.QueryResultContainer>
          <Typography variant="h4" gutterBottom>
            Tables
          </Typography>
          {tableRowsLoading ? <CircularProgress /> : tablesTable}
        </S.QueryResultContainer>
        <S.QueryResultContainer>
          <Typography variant="h4" gutterBottom>
            Buckets
          </Typography>
          {bucketRowsLoading ? <CircularProgress /> : bucketsTable}
        </S.QueryResultContainer>
      </S.MainContainer>
    </NavigationPage>
  );
}

namespace S {
  export const MainPaper = styled(Paper)`
    margin-bottom: 10px;
  `;

  export const MainContainer = styled(Box)`
    padding: 20px;
  `;

  export const QueryResultContainer = styled(Box)`
    margin-top: 40px;
    width: 100%;
  `;

  export const CenteredGrid = styled(Grid)`
    display: flex;
    justify-content: center;
    align-items: center;
  `;
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
