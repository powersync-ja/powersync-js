'use client';
import React from 'react';
import { usePowerSyncWatchedQuery } from '@journeyapps/powersync-react';
import { Box, Button, Grid, TextField, styled } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

const DEFAULT_QUERY = 'SELECT * FROM documents';

export default function SQLConsolePage() {
  const inputRef = React.useRef<HTMLInputElement>();
  const [query, setQuery] = React.useState(DEFAULT_QUERY);
  const querySQLResult = usePowerSyncWatchedQuery(query);

  const queryDataGridResult = React.useMemo(() => {
    const firstItem = querySQLResult?.[0];

    return {
      columns: firstItem
        ? Object.keys(firstItem).map((field) => ({
            field,
            flex: 1
          }))
        : [],
      rows: querySQLResult
    };
  }, [querySQLResult]);

  return (
    <S.MainContainer>
      <S.CenteredGrid container>
        <S.CenteredGrid item xs={12} md={10}>
          <TextField
            inputRef={inputRef}
            fullWidth
            label="Query"
            defaultValue={DEFAULT_QUERY}
            onKeyDown={(e) => {
              const inputValue = inputRef.current?.value;
              if (e.key == 'Enter' && inputValue) {
                setQuery(inputValue);
              }
            }}
          />
        </S.CenteredGrid>
        <S.CenteredGrid item xs={12} md={2}>
          <Button
            sx={{ margin: '10px' }}
            variant="contained"
            onClick={() => {
              const queryInput = inputRef?.current?.value;
              if (queryInput) {
                setQuery(queryInput);
              }
            }}
          >
            Execute Query
          </Button>
        </S.CenteredGrid>
      </S.CenteredGrid>

      {queryDataGridResult ? (
        <S.QueryResultContainer>
          {queryDataGridResult.columns ? (
            <DataGrid
              autoHeight={true}
              rows={queryDataGridResult.rows?.map((r, index) => ({ ...r, id: r.id ?? index })) ?? []}
              columns={queryDataGridResult.columns}
              initialState={{
                pagination: {
                  paginationModel: {
                    pageSize: 20
                  }
                }
              }}
              pageSizeOptions={[20]}
              disableRowSelectionOnClick
            />
          ) : null}
        </S.QueryResultContainer>
      ) : null}
    </S.MainContainer>
  );
}

namespace S {
  export const MainContainer = styled(Box)`
    padding: 20px;
    background-color: #000;
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
