import React from 'react';
import { useQuery } from '@powersync/react';
import { NavigationPage } from '@/components/navigation/NavigationPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';

const DEFAULT_QUERY = `SELECT name FROM ps_buckets`;

export default function SQLConsolePage() {
  const inputRef = React.useRef<HTMLInputElement>();
  const [query, setQuery] = React.useState(DEFAULT_QUERY);
  const { data: querySQLResult, isLoading, error } = useQuery(query);

  const columns = React.useMemo<DataTableColumn<any>[]>(() => {
    const firstItem = querySQLResult?.[0];
    if (!firstItem) return [];

    return Object.keys(firstItem).map((field) => ({
      field,
      headerName: field,
      flex: 1
    }));
  }, [querySQLResult]);

  const rows = React.useMemo(() => {
    return (querySQLResult ?? []).map((r: any, index: number) => ({
      ...r,
      id: r.id ?? index
    }));
  }, [querySQLResult]);

  const errorMessage = (error?.cause as any)?.message ?? error?.message;

  return (
    <NavigationPage title="SQL Console">
      <div className="p-5">
        <div className="flex flex-wrap items-end gap-2.5 justify-center mb-10">
          <div className="flex-1 min-w-[300px] space-y-1.5">
            <Label htmlFor="query-input">Query</Label>
            <Input
              id="query-input"
              ref={inputRef as React.RefObject<HTMLInputElement>}
              defaultValue={DEFAULT_QUERY}
              onKeyDown={(e) => {
                const inputValue = inputRef.current?.value;
                if (e.key == 'Enter' && inputValue) {
                  setQuery(inputValue);
                }
              }}
              className={error ? 'border-destructive' : ''}
            />
            {error && <p className="text-sm text-destructive">{errorMessage}</p>}
          </div>
          <Button
            onClick={() => {
              const queryInput = inputRef?.current?.value;
              if (queryInput) {
                setQuery(queryInput);
              }
            }}>
            Execute
          </Button>
        </div>

        {!isLoading ? (
          <div className="mt-10">
            {columns.length > 0 ? (
              <DataTable rows={rows} columns={columns} pageSize={20} pageSizeOptions={[10, 20, 50, 100]} />
            ) : null}
          </div>
        ) : (
          <div className="flex justify-center items-center py-10">
            <Spinner size="lg" />
          </div>
        )}
      </div>
    </NavigationPage>
  );
}
