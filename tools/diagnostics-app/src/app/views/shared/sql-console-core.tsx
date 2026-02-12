import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { QueryHistoryDropdown, addToQueryHistory, removeFromQueryHistory } from './query-history';

// ---------------------------------------------------------------------------
// SQLConsoleCore - the reusable SQL console UI
// ---------------------------------------------------------------------------

const MAX_RESULT_ROWS = 10_000;

export interface SQLConsoleCoreProps {
  /** Execute a query and return the results as an array of row objects */
  executeQuery: (sql: string, params?: any[]) => Promise<Record<string, any>[]>;
  /** Default query shown in the input */
  defaultQuery?: string;
  /** History source identifier (e.g. 'powersync' or 'inspector') */
  historySource?: string;
  /** Whether the target database is ready for queries. Auto-execution is deferred until true. Defaults to true. */
  ready?: boolean;
}

export function SQLConsoleCore({ executeQuery, defaultQuery = '', historySource = 'powersync', ready = true }: SQLConsoleCoreProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const inputWrapperRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const portalRef = React.useRef<HTMLDivElement>(null);
  const [results, setResults] = React.useState<Record<string, any>[] | null>(null);
  const [totalRowCount, setTotalRowCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [autoLimited, setAutoLimited] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);
  const hasExecutedRef = React.useRef(false);
  const pendingQueryRef = React.useRef<string | null>(null);

  // Close dropdown when clicking outside (check both inline ref and portalled dropdown)
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        (!portalRef.current || !portalRef.current.contains(target))
      ) {
        setShowHistory(false);
      }
    };

    if (showHistory) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showHistory]);

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
        const wasAutoLimited = !hasLimit && data.length > MAX_RESULT_ROWS;
        setTotalRowCount(data.length);
        if (data.length > MAX_RESULT_ROWS) {
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

  const handleExecute = React.useCallback(() => {
    const queryInput = inputRef.current?.value;
    if (queryInput) {
      runQuery(queryInput);
      addToQueryHistory(queryInput, historySource);
      setShowHistory(false);
    }
  }, [runQuery, historySource]);

  const handleInitialQuery = React.useCallback(
    (lastQuery: string) => {
      if (inputRef.current) {
        inputRef.current.value = lastQuery;
      }
      hasExecutedRef.current = true;
      if (ready) {
        runQuery(lastQuery);
      } else {
        pendingQueryRef.current = lastQuery;
      }
    },
    [ready, runQuery]
  );

  const handleSelectQuery = React.useCallback(
    (historyQuery: string) => {
      if (inputRef.current) inputRef.current.value = historyQuery;
      runQuery(historyQuery);
      addToQueryHistory(historyQuery, historySource);
      setShowHistory(false);
    },
    [runQuery, historySource]
  );

  // Execute pending query once the database becomes ready
  React.useEffect(() => {
    if (ready && pendingQueryRef.current) {
      const pending = pendingQueryRef.current;
      pendingQueryRef.current = null;
      runQuery(pending);
    }
  }, [ready, runQuery]);

  // Execute default query on mount if no history restores a query
  React.useEffect(() => {
    if (!ready || !defaultQuery || hasExecutedRef.current) return;
    // Give history a moment to restore; if it doesn't, run the default
    const timeout = setTimeout(() => {
      if (!hasExecutedRef.current) {
        hasExecutedRef.current = true;
        runQuery(defaultQuery);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [ready, defaultQuery, runQuery]);

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
      <div className="flex flex-wrap items-end gap-2.5 mb-4">
        <div className="min-w-0 flex-1 basis-0 space-y-1.5 relative" ref={dropdownRef}>
          <Label htmlFor="query-input">Query</Label>
          <div className="flex gap-2 items-center">
            <div className="relative flex-1" ref={inputWrapperRef}>
              <Input
                id="query-input"
                ref={inputRef}
                defaultValue={defaultQuery}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleExecute();
                  }
                }}
                className={error ? 'border-destructive pr-10' : 'pr-10'}
              />
              <QueryHistoryDropdown
                source={historySource}
                anchorRef={inputWrapperRef}
                portalRef={portalRef}
                onSelectQuery={handleSelectQuery}
                onInitialQuery={handleInitialQuery}
                onRemoveEntry={removeFromQueryHistory}
                showHistory={showHistory}
                onToggleHistory={() => setShowHistory(!showHistory)}
                onClose={() => setShowHistory(false)}
              />
            </div>
            <Button onClick={handleExecute} className="h-10">
              Execute
            </Button>
          </div>
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
