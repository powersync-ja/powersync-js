import React from 'react';
import ReactDOM from 'react-dom';
import ClickAwayListener from 'react-click-away-listener';
import { PowerSyncContext, useQuery } from '@powersync/react';
import { Button } from '@/components/ui/button';
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

export interface QueryHistoryDropdownProps {
  source: string;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  onSelectQuery: (query: string) => void;
  onInitialQuery: (query: string) => void;
  onRemoveEntry: (id: string) => void;
  showHistory: boolean;
  onToggleHistory: () => void;
  onClose: () => void;
}

/**
 * History dropdown content - uses useQuery inside the local provider context.
 */
function QueryHistoryContent({
  source,
  anchorRef,
  onSelectQuery,
  onInitialQuery,
  onRemoveEntry,
  showHistory,
  onToggleHistory,
  onClose
}: QueryHistoryDropdownProps) {
  const hasRestoredRef = React.useRef(false);
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({});

  const { data: queryHistory, isLoading } = useQuery<QueryHistoryEntry>(
    `SELECT id, query, executed_at FROM query_history WHERE source = ? ORDER BY executed_at DESC LIMIT ?`,
    [source, MAX_HISTORY]
  );

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
          <ClickAwayListener
            onClickAway={(e) => {
              // Don't close when clicking the anchor area (e.g. toggle button)
              if (anchorRef.current?.contains(e.target as Node)) return;
              onClose();
            }}>
            <div
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
            </div>
          </ClickAwayListener>,
          document.body
        )}
    </>
  );
}

/**
 * Wrapper that provides localStateDb context for the history dropdown.
 */
export function QueryHistoryDropdown(props: QueryHistoryDropdownProps) {
  return (
    <PowerSyncContext.Provider value={localStateDb}>
      <QueryHistoryContent {...props} />
    </PowerSyncContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// History helpers
// ---------------------------------------------------------------------------

export async function addToQueryHistory(query: string, source: string) {
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

export async function removeFromQueryHistory(id: string) {
  await localStateDb.execute(`DELETE FROM query_history WHERE id = ?`, [id]);
}
