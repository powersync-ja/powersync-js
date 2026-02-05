import React from 'react';
import { PowerSyncContext, useQuery } from '@powersync/react';
import { NavigationPage } from '@/components/navigation/NavigationPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { History, X, ChevronDown } from 'lucide-react';
import { localStateDb } from '@/library/powersync/LocalStateManager';

const DEFAULT_QUERY = `SELECT name FROM ps_buckets`;
const MAX_HISTORY = 20;

interface QueryHistoryEntry {
  id: string;
  query: string;
  executed_at: string;
}

interface QueryHistoryDropdownProps {
  onSelectQuery: (query: string) => void;
  onInitialQuery: (query: string) => void;
  onRemoveEntry: (id: string) => void;
  showHistory: boolean;
  onToggleHistory: () => void;
  onClose: () => void;
}

/**
 * History dropdown content - uses useQuery inside the local provider context
 */
function QueryHistoryContent({
  onSelectQuery,
  onInitialQuery,
  onRemoveEntry,
  showHistory,
  onToggleHistory,
  onClose
}: QueryHistoryDropdownProps) {
  const hasRestoredRef = React.useRef(false);

  // useQuery reads from localStateDb (nested PowerSyncContext.Provider). runQueryOnce for local-only table.
  const { data: historyData, isLoading } = useQuery<QueryHistoryEntry>(
    `SELECT id, query, executed_at FROM query_history ORDER BY executed_at DESC LIMIT ?`,
    [MAX_HISTORY],
    { runQueryOnce: true }
  );
  const queryHistory = historyData ?? [];

  // Restore last query on initial load only
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

      {showHistory && queryHistory.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 border rounded-lg bg-popover shadow-lg max-h-64 overflow-y-auto">
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
        </div>
      )}
    </>
  );
}

/**
 * Wrapper that provides localStateDb context for the history dropdown.
 * This allows useQuery inside to read from the local state database
 * while the parent component's useQuery reads from the synced database.
 */
function QueryHistoryDropdown(props: QueryHistoryDropdownProps) {
  return (
    <PowerSyncContext.Provider value={localStateDb}>
      <QueryHistoryContent {...props} />
    </PowerSyncContext.Provider>
  );
}

export default function SQLConsolePage() {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [query, setQuery] = React.useState(DEFAULT_QUERY);
  const [showHistory, setShowHistory] = React.useState(false);

  // useQuery runs against the synced db (outer PowerSyncContext). Pass [] when no parameters.
  const { data: querySQLResult, isLoading, error } = useQuery(query, [], { runQueryOnce: true });

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowHistory(false);
      }
    };

    if (showHistory) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showHistory]);

  const addToHistory = React.useCallback(async (newQuery: string) => {
    const trimmed = newQuery.trim();
    if (!trimmed) return;
    await localStateDb.execute(`DELETE FROM query_history WHERE query = ?`, [trimmed]);
    await localStateDb.execute(
      `INSERT INTO query_history (id, query, executed_at) VALUES (uuid(), ?, datetime('now'))`,
      [trimmed]
    );
    await localStateDb.execute(
      `DELETE FROM query_history WHERE id NOT IN (SELECT id FROM query_history ORDER BY executed_at DESC LIMIT ?)`,
      [MAX_HISTORY]
    );
  }, []);

  const removeFromHistory = React.useCallback(async (id: string) => {
    await localStateDb.execute(`DELETE FROM query_history WHERE id = ?`, [id]);
  }, []);

  const handleInitialQuery = React.useCallback((lastQuery: string) => {
    if (inputRef.current) {
      inputRef.current.value = lastQuery;
    }
    setQuery(lastQuery);
  }, []);

  const handleSelectQuery = React.useCallback(
    (historyQuery: string) => {
      if (inputRef.current) inputRef.current.value = historyQuery;
      setQuery(historyQuery);
      addToHistory(historyQuery);
      setShowHistory(false);
    },
    [addToHistory]
  );

  const executeQuery = React.useCallback(() => {
    const queryInput = inputRef.current?.value;
    if (queryInput) {
      setQuery(queryInput);
      addToHistory(queryInput);
      setShowHistory(false);
    }
  }, [addToHistory]);

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
      <div className="min-w-0 max-w-full overflow-x-hidden p-5">
        <div className="flex flex-wrap items-end gap-2.5 mb-4">
          <div className="min-w-0 flex-1 basis-0 space-y-1.5 relative" ref={dropdownRef}>
            <Label htmlFor="query-input">Query</Label>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Input
                  id="query-input"
                  ref={inputRef}
                  defaultValue={DEFAULT_QUERY}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      executeQuery();
                    }
                  }}
                  className={error ? 'border-destructive pr-10' : 'pr-10'}
                />
                {/* History dropdown with nested local provider */}
                <QueryHistoryDropdown
                  onSelectQuery={handleSelectQuery}
                  onInitialQuery={handleInitialQuery}
                  onRemoveEntry={removeFromHistory}
                  showHistory={showHistory}
                  onToggleHistory={() => setShowHistory(!showHistory)}
                  onClose={() => setShowHistory(false)}
                />
              </div>
              <Button onClick={executeQuery} className="h-10">
                Execute
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{errorMessage}</p>}
          </div>
        </div>

        {!isLoading ? (
          <div className="mt-6 min-w-0">
            {columns.length > 0 ? (
              <DataTable rows={rows} columns={columns} pageSize={20} pageSizeOptions={[10, 20, 50, 100]} />
            ) : (
              <div className="text-center py-10 text-muted-foreground">No results</div>
            )}
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
