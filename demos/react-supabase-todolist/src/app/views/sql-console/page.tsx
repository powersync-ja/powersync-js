import React, { Suspense } from 'react';
import { usePowerSyncWatchedQuery } from '@journeyapps/powersync-react';
import { Box, Button, CircularProgress, Grid, TextField, styled } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { NavigationPage } from '@/components/navigation/NavigationPage';

import { ErrorBoundary } from "react-error-boundary";

export type LoginFormParams = {
  email: string;
  password: string;
};

const DEFAULT_QUERY = 'SELECT * FROM lists';

export default function SQLConsolePage() {
  const inputRef = React.useRef<HTMLInputElement>();
  const [query, setQuery] = React.useState(DEFAULT_QUERY);

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

        <Suspense fallback={<CircularProgress />}>
          {/* Use resetKeys to dismiss the error when changing the query. */}
          <ErrorBoundary
            fallbackRender={fallbackRender} resetKeys={[query]}>
            <SqlConsoleResults query={query} />
          </ErrorBoundary>
        </Suspense>

      </S.MainContainer>
    </NavigationPage>
  );
}

function SqlConsoleResults(props: { query: string }) {
  const querySQLResult = usePowerSyncWatchedQuery(props.query);

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

  return queryDataGridResult ? (
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
  ) : null
}

function fallbackRender(options: { error: any }) {
  return (
    <div role="alert">
      <pre style={{ color: "red" }}>{options.error.message}</pre>
    </div>
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
