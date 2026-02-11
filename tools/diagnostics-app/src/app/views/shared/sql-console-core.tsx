import React from 'react';
import ReactDOM from 'react-dom';
import { PowerSyncContext, useQuery } from '@powersync/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { History, X, ChevronDown } from 'lucide-react';
import { localStateDb } from '@/library/powersync/LocalStateManager';

const MAX_HISTORY = 20;

// ---------------------------------------------------------------------------
// Query History (separate per source: 'powersync' vs 'inspector')
// ---------------------------------------------------------------------------

interface QueryHistoryEntry {
  id: string;
  query: string;
  executed_at: string;
}

interface QueryHistoryDropdownProps {
  source: string;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  portalRef: React.RefObject<HTMLDivElement>;
  onSelectQuery: (query: string) => void;
  onInitialQuery: (query: string) => void;
  onRemoveEntry: (id: string) => void;
  showHistory: boolean;
  onToggleHistory: () => void;
  onClose: () => void;
}

/**
 * History dropdown content - uses useQuery inside the local provider context.
 * Renders the dropdown panel via a portal to document.body with position:fixed
 * so it floats over all content regardless of parent overflow settings.
 */
function QueryHistoryContent({
  source,
  anchorRef,
  portalRef,
  onSelectQuery,
  onInitialQuery,
  onRemoveEntry,
  showHistory,
  onToggleHistory,
  onClose
}: QueryHistoryDropdownProps) {
  const hasRestoredRef = React.useRef(false);
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({});

  const { data: historyData, isLoading } = useQuery<QueryHistoryEntry>(
    `SELECT id, query, executed_at FROM query_history WHERE source = ? ORDER BY executed_at DESC LIMIT ?`,
    [source, MAX_HISTORY]
  );
  const queryHistory = historyData ?? [];

  React.useEffect(() => {
    if (hasRestoredRef.current || isLoading) return;

    const lastQuery = queryHistory[0]?.query;
    if (lastQuery) {
      hasRestoredRef.current = true;
      onInitialQuery(lastQuery);
    } else if (!isLoading && queryHistory.length === 0) {
      hasRestoredRef.current = true;
    }
  }, [queryHistory, isLoading, onInitialQuery]);

  // Compute fixed position from anchor element when dropdown opens
  React.useEffect(() => {
    if (!showHistory || !anchorRef.current) return;

    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (rect) {
        setDropdownStyle({
          position: 'fixed',
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
          zIndex: 50
        });
      }
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showHistory, anchorRef]);

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRemoveEntry(id);
  };

  return (
    <>
      {queryHistory.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleHistory}
          title="Query history"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0">
          <ChevronDown className={`h-4 w-4 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
        </Button>
      )}

      {showHistory &&
        queryHistory.length > 0 &&
        ReactDOM.createPortal(
          <div
            ref={portalRef}
            style={dropdownStyle}
            className="border rounded-lg bg-popover shadow-lg max-h-64 overflow-y-auto">
            <div className="p-2 border-b bg-muted/50 flex items-center justify-between sticky top-0">
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" />
                Recent Queries
              </span>
              <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="py-1">
              {queryHistory.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => onSelectQuery(entry.query)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-accent cursor-pointer group">
                  <span className="flex-1 text-sm font-mono truncate">{entry.query}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleRemove(entry.id, e)}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

/**
 * Wrapper that provides localStateDb context for the history dropdown.
 */
function QueryHistoryDropdown(props: QueryHistoryDropdownProps) {
  return (
    <PowerSyncContext.Provider value={localStateDb}>
      <QueryHistoryContent {...props} />
    </PowerSyncContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// History helpers
// ---------------------------------------------------------------------------

async function addToQueryHistory(query: string, source: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  await localStateDb.execute(`DELETE FROM query_history WHERE query = ? AND source = ?`, [trimmed, source]);
  await localStateDb.execute(
    `INSERT INTO query_history (id, query, executed_at, source) VALUES (uuid(), ?, datetime('now'), ?)`,
    [trimmed, source]
  );
  await localStateDb.execute(
    `DELETE FROM query_history WHERE source = ? AND id NOT IN (SELECT id FROM query_history WHERE source = ? ORDER BY executed_at DESC LIMIT ?)`,
    [source, source, MAX_HISTORY]
  );
}

async function removeFromQueryHistory(id: string) {
  await localStateDb.execute(`DELETE FROM query_history WHERE id = ?`, [id]);
}

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

  // Execute default query on mount if no history restores a query
  React.useEffect(() => {
    if (defaultQuery && !hasExecutedRef.current) {
      // Give history a moment to restore; if it doesn't, run the default
      const timeout = setTimeout(() => {
        if (!hasExecutedRef.current) {
          hasExecutedRef.current = true;
          runQuery(defaultQuery);
        }
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [defaultQuery, runQuery]);

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
