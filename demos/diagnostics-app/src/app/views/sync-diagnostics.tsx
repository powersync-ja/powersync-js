import React from 'react';
import { usePowerSyncWatchedQuery } from '@journeyapps/powersync-react';
import {
  Box,
  Button,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  styled
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { NavigationPage } from '@/components/navigation/NavigationPage';
import { clearData } from '@/library/powersync/ConnectionManager';

export type LoginFormParams = {
  email: string;
  password: string;
};

const DEFAULT_QUERY = `
WITH
  oplog_by_table AS
    (SELECT
      bucket,
      row_type,
      sum(length(data)) as data_size,
      sum(length(row_type) + length(row_id) + length(bucket) + length(key) + 40) as metadata_size,
      count() as row_count
    FROM ps_oplog GROUP BY bucket, row_type),

  oplog_stats AS
    (SELECT
      bucket as name,
      sum(data_size) as data_size,
      sum(metadata_size) as metadata_size,
      sum(row_count) as row_count,
      json_group_array(row_type) tables
    FROM oplog_by_table GROUP BY bucket)

SELECT
  local.id as name,
  stats.tables,
  stats.data_size,
  stats.metadata_size,
  stats.row_count,
  local.download_size,
  local.total_operations,
  local.downloading
FROM local_bucket_data local
JOIN oplog_stats stats ON stats.name = local.id`;

export default function SyncDiagnosticsPage() {
  const bucketRows = usePowerSyncWatchedQuery(DEFAULT_QUERY);

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

  const rows = bucketRows.map((r) => {
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
    row_count: rows.reduce((total, row) => total + row.row_count, 0),
    total_operations: rows.reduce((total, row) => total + row.total_operations, 0),
    data_size: rows.reduce((total, row) => total + row.data_size, 0),
    metadata_size: rows.reduce((total, row) => total + row.metadata_size, 0),
    download_size: rows.reduce((total, row) => total + row.download_size, 0)
  };

  return (
    <NavigationPage title="Sync Diagnostics">
      <S.MainContainer>
        <S.CenteredGrid container>
          <S.CenteredGrid item xs={12} md={2}>
            <Button
              sx={{ margin: '10px' }}
              variant="contained"
              onClick={() => {
                clearData();
              }}>
              Clear Data
            </Button>
            <p>
              Total Rows: {totals.row_count}
              <br />
              Total Operations: {totals.total_operations}
              <br />
              Total Data Size: {formatBytes(totals.data_size)}
              <br />
              Total Metadata Size: {formatBytes(totals.metadata_size)}
              <br />
              Total Download Size: {formatBytes(totals.download_size)}
              <br />
            </p>
          </S.CenteredGrid>
        </S.CenteredGrid>

        <S.QueryResultContainer>
          <DataGrid
            autoHeight={true}
            rows={rows}
            columns={columns}
            initialState={{
              pagination: {
                paginationModel: {
                  pageSize: 50
                }
              }
            }}
            pageSizeOptions={[20]}
            disableRowSelectionOnClick
          />
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
