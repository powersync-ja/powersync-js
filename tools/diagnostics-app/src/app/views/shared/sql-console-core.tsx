import React from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { QueryHistoryDropdown } from './query-history';

// ---------------------------------------------------------------------------
// SQLConsoleCore - the reusable SQL console UI
// ---------------------------------------------------------------------------

const MAX_RESULT_ROWS = 10_000;

export interface TemplateQuery {
  label: string;
  query: string;
  tooltip: string;
  docsUrl?: string;
}

const DOCS_URL =
  'https://docs.powersync.com/architecture/client-architecture#client-side-schema-and-sqlite-database-structure';

export const POWERSYNC_TEMPLATE_QUERIES: TemplateQuery[] = [
  {
    label: 'ps_untyped',
    query: 'SELECT * FROM ps_untyped',
    tooltip:
      'Any synced table not defined in the client-side schema is placed here. Data is migrated to ps_data__<table> once the table is added to the schema.',
    docsUrl: DOCS_URL
  },
  {
    label: 'ps_oplog',
    query: 'SELECT * FROM ps_oplog',
    tooltip: 'Operation history data as received from the PowerSync Service, grouped per bucket.',
    docsUrl: DOCS_URL
  },
  {
    label: 'ps_crud',
    query: 'SELECT * FROM ps_crud',
    tooltip: 'The client-side upload queue.',
    docsUrl: DOCS_URL
  },
  {
    label: 'ps_buckets',
    query: 'SELECT * FROM ps_buckets',
    tooltip: 'A small amount of metadata for each bucket.',
    docsUrl: DOCS_URL
  }
];

export interface SQLConsoleCoreProps {
  /** Execute a query and return the results as an array of row objects */
  executeQuery: (sql: string, params?: any[]) => Promise<Record<string, any>[]>;
  /** Default query shown in the input */
  defaultQuery?: string;
  /** History source identifier (e.g. 'powersync' or 'inspector') */
  historySource?: string;
  /** Whether the target database is ready for queries. Auto-execution is deferred until true. Defaults to true. */
  ready?: boolean;
  /** Predefined queries shown as quick-select buttons. These don't save to history. */
  templateQueries?: TemplateQuery[];
}

export function SQLConsoleCore({ executeQuery, defaultQuery = '', historySource = 'powersync', ready = true, templateQueries }: SQLConsoleCoreProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [results, setResults] = React.useState<Record<string, any>[] | null>(null);
  const [totalRowCount, setTotalRowCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [autoLimited, setAutoLimited] = React.useState(false);

  const runQuery = React.useCallback(
    async (sql: string) => {
      setIsLoading(true);
      setError(null);
      // Yield to allow React to render the loading spinner before the query blocks the main thread
      await new Promise((resolve) => setTimeout(resolve, 0));
      try {
        // Auto-limit queries without an explicit LIMIT to avoid fetching hundreds of thousands of rows
        const hasLimit = /\bLIMIT\s+\d+/i.test(sql);
        const effectiveSql = hasLimit ? sql : `${sql.replace(/;\s*$/, '')} LIMIT ${MAX_RESULT_ROWS + 1}`;
        const data = await executeQuery(effectiveSql);
        const overRowLimit = data.length > MAX_RESULT_ROWS;
        const wasAutoLimited = !hasLimit && overRowLimit;
        setTotalRowCount(data.length);
        if (overRowLimit) {
          setResults(data.slice(0, MAX_RESULT_ROWS));
        } else {
          setResults(data);
        }
        setAutoLimited(wasAutoLimited);
      } catch (err: any) {
        const message = (err?.cause as any)?.message ?? err?.message ?? 'Query failed';
        setError(message);
        setResults(null);
        setTotalRowCount(0);
        setAutoLimited(false);
      } finally {
        setIsLoading(false);
      }
    },
    [executeQuery]
  );

  const handleQueryChanged = React.useCallback(
    ({ query }: { query: string }) => runQuery(query),
    [runQuery]
  );

  const columns = React.useMemo<DataTableColumn<any>[]>(() => {
    const firstItem = results?.[0];
    if (!firstItem) return [];
    return Object.keys(firstItem).map((field) => ({
      field,
      headerName: field,
      flex: 1
    }));
  }, [results]);

  const rows = React.useMemo(() => {
    return (results ?? []).map((r: any, index: number) => ({
      ...r,
      id: r.id ?? index
    }));
  }, [results]);

  const isTruncated = totalRowCount > MAX_RESULT_ROWS || autoLimited;

  return (
    <div className="min-w-0 max-w-full p-5">
      {templateQueries && templateQueries.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <TooltipProvider delayDuration={200}>
            {templateQueries.map((tq) => (
              <Tooltip key={tq.label}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (inputRef.current) inputRef.current.value = tq.query;
                      runQuery(tq.query);
                    }}>
                    {tq.label}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{tq.tooltip}</p>
                  {tq.docsUrl && (
                    <a
                      href={tq.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-primary-foreground/80 hover:text-primary-foreground mt-1 inline-block text-xs">
                      View docs
                    </a>
                  )}
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
      )}
      <div className="flex flex-wrap items-end gap-2.5 mb-4">
        <div className="min-w-0 flex-1 basis-0 space-y-1.5 relative">
          <Label htmlFor="query-input">Query</Label>
          <QueryHistoryDropdown
            source={historySource}
            defaultQuery={defaultQuery}
            ready={ready}
            error={error}
            onQueryChanged={handleQueryChanged}
            inputRef={inputRef}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-10">
          <Spinner size="lg" />
        </div>
      ) : results !== null ? (
        <div className="mt-6 min-w-0">
          {isTruncated && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">
              {autoLimited
                ? `Results limited to ${MAX_RESULT_ROWS.toLocaleString()} rows. Add a LIMIT clause to your query to control the result size.`
                : `Showing first ${MAX_RESULT_ROWS.toLocaleString()} of ${totalRowCount.toLocaleString()} rows.`}
            </p>
          )}
          {columns.length > 0 ? (
            <DataTable rows={rows} columns={columns} pageSize={20} pageSizeOptions={[10, 20, 50, 100]} />
          ) : (
            <div className="text-center py-10 text-muted-foreground">No results</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
