import React from 'react';
import ReactDOM from 'react-dom';
import ClickAwayListener from 'react-click-away-listener';
import { PowerSyncContext, useQuery } from '@powersync/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { History, X, ChevronDown } from 'lucide-react';
import { localStateDb } from '@/library/powersync/LocalStateManager';

const MAX_HISTORY = 20;

interface QueryHistoryEntry {
  id: string;
  query: string;
  executed_at: string;
}

export interface QueryHistoryDropdownProps {
  source: string;
  defaultQuery?: string;
  ready?: boolean;
  error?: string | null;
  onQueryChanged: (params: { query: string }) => void;
}

/**
 * Inner component that renders the query input, execute button, and history dropdown.
 * Must be rendered inside a PowerSyncContext provider for useQuery to work.
 */
function QueryHistoryInput({ source, defaultQuery = '', ready = true, error, onQueryChanged }: QueryHistoryDropdownProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const inputWrapperRef = React.useRef<HTMLDivElement>(null);
  const [showHistory, setShowHistory] = React.useState(false);
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({});
  const hasExecutedRef = React.useRef(false);
  const pendingQueryRef = React.useRef<string | null>(null);

  const { data: queryHistory, isLoading } = useQuery<QueryHistoryEntry>(
    `SELECT id, query, executed_at FROM query_history WHERE source = ? ORDER BY executed_at DESC LIMIT ?`,
    [source, MAX_HISTORY]
  );

  // Restore last query from history on initial load
  const hasRestoredRef = React.useRef(false);
  React.useEffect(() => {
    if (hasRestoredRef.current || isLoading) return;

    const lastQuery = queryHistory[0]?.query;
    if (lastQuery) {
      hasRestoredRef.current = true;
      if (inputRef.current) inputRef.current.value = lastQuery;
      hasExecutedRef.current = true;
      if (ready) {
        onQueryChanged({ query: lastQuery });
      } else {
        pendingQueryRef.current = lastQuery;
      }
    } else if (queryHistory.length === 0) {
      hasRestoredRef.current = true;
    }
  }, [queryHistory, isLoading, ready, onQueryChanged]);

  // Execute pending query once the database becomes ready
  React.useEffect(() => {
    if (ready && pendingQueryRef.current) {
      const pending = pendingQueryRef.current;
      pendingQueryRef.current = null;
      onQueryChanged({ query: pending });
    }
  }, [ready, onQueryChanged]);

  // Execute default query on mount if no history restores a query
  React.useEffect(() => {
    if (!ready || !defaultQuery || hasExecutedRef.current) return;
    const timeout = setTimeout(() => {
      if (!hasExecutedRef.current) {
        hasExecutedRef.current = true;
        onQueryChanged({ query: defaultQuery });
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [ready, defaultQuery, onQueryChanged]);

  // Position dropdown relative to input
  React.useEffect(() => {
    if (!showHistory || !inputWrapperRef.current) return;

    const updatePosition = () => {
      const rect = inputWrapperRef.current?.getBoundingClientRect();
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
  }, [showHistory]);

  const handleExecute = React.useCallback(() => {
    const query = inputRef.current?.value;
    if (query) {
      addToQueryHistory(query, source);
      onQueryChanged({ query });
      setShowHistory(false);
    }
  }, [source, onQueryChanged]);

  const handleSelectQuery = React.useCallback(
    (query: string) => {
      if (inputRef.current) inputRef.current.value = query;
      addToQueryHistory(query, source);
      onQueryChanged({ query });
      setShowHistory(false);
    },
    [source, onQueryChanged]
  );

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    removeFromQueryHistory(id);
  };

  return (
    <>
      <div className="flex gap-2 items-center">
        <div className="relative flex-1" ref={inputWrapperRef}>
          <Input
            id="query-input"
            ref={inputRef}
            defaultValue={defaultQuery}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleExecute();
            }}
            className={error ? 'border-destructive pr-10' : 'pr-10'}
          />
          {queryHistory.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              title="Query history"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0">
              <ChevronDown className={`h-4 w-4 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            </Button>
          )}
        </div>
        <Button onClick={handleExecute} className="h-10">
          Execute
        </Button>
      </div>

      {showHistory &&
        queryHistory.length > 0 &&
        ReactDOM.createPortal(
          <ClickAwayListener
            onClickAway={(e) => {
              if (inputWrapperRef.current?.contains(e.target as Node)) return;
              setShowHistory(false);
            }}>
            <div
              style={dropdownStyle}
              className="border rounded-lg bg-popover shadow-lg max-h-64 overflow-y-auto">
              <div className="p-2 border-b bg-muted/50 flex items-center justify-between sticky top-0">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" />
                  Recent Queries
                </span>
                <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)} className="h-6 w-6 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="py-1">
                {queryHistory.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => handleSelectQuery(entry.query)}
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
          </ClickAwayListener>,
          document.body
        )}
    </>
  );
}

/**
 * Query input with history dropdown. Manages input state, history persistence,
 * and emits onQueryChanged when a query should be executed.
 */
export function QueryHistoryDropdown(props: QueryHistoryDropdownProps) {
  return (
    <PowerSyncContext.Provider value={localStateDb}>
      <QueryHistoryInput {...props} />
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
