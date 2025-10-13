import { NavigationPage } from '@/components/navigation/NavigationPage';
import { Alert, Box, Button, Grid, TextField, styled } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useQuery } from '@powersync/react';
import React from 'react';

export type LoginFormParams = {
  email: string;
  password: string;
};

const DEFAULT_QUERY = /* sql */ `
  SELECT
    *
  FROM
    lists
`;

const TableDisplay = React.memo(({ data }: { data: ReadonlyArray<any> }) => {
  const queryDataGridResult = React.useMemo(() => {
    const firstItem = data?.[0];
    return {
      columns: firstItem
        ? Object.keys(firstItem).map((field) => ({
            field,
            flex: 1
          }))
        : [],
      rows: data
    };
  }, [data]);

  return (
    <S.QueryResultContainer>
      <DataGrid
        autoHeight={true}
        rows={queryDataGridResult.rows.map((r, index) => ({ ...r, id: r.id ?? index })) ?? []}
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
    </S.QueryResultContainer>
  );
});

export default function SQLConsolePage() {
  const inputRef = React.useRef<HTMLInputElement>();
  const [query, setQuery] = React.useState(DEFAULT_QUERY);

  const { data, error } = useQuery(query, [], {
    /**
     * We don't use the isFetching status here, we can avoid re-renders if we don't report on it.
     */
    reportFetching: false,
    /**
     * The query here will only emit results when the query data set changes.
     * Result sets are compared by serializing each item to JSON and comparing the strings.
     */
    rowComparator: {
      keyBy: (item: any) => JSON.stringify(item),
      compareBy: (item: any) => JSON.stringify(item)
    }
  });

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
              }}>
              Execute Query
            </Button>
          </S.CenteredGrid>
        </S.CenteredGrid>
        {error ? <Alert severity="error">{error.message}</Alert> : null}
        <TableDisplay data={data} />
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
