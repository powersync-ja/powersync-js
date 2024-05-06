import React from 'react';
import { useQuery } from '@powersync/react';
import { Box, Button, CircularProgress, Grid, TextField, styled } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { NavigationPage } from '@/components/navigation/NavigationPage';

const DEFAULT_QUERY = `SELECT name FROM ps_buckets`;

export default function SQLConsolePage() {
  const inputRef = React.useRef<HTMLInputElement>();
  const [query, setQuery] = React.useState(DEFAULT_QUERY);
  const { data: querySQLResult, isLoading, error } = useQuery(query);

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

  const errorMessage = (error?.cause as any)?.message ?? error?.message;

  return (
    <NavigationPage title="SQL Console">
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
              error={error != null}
              helperText={errorMessage}
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
              }}>
              Execute
            </Button>
          </S.CenteredGrid>
        </S.CenteredGrid>

        {!isLoading ? (
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
        ) : (
          <CircularProgress />
        )}
      </S.MainContainer>
    </NavigationPage>
  );
}

namespace S {
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
