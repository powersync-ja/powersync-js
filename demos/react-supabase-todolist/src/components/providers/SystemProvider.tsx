import { configureFts } from '@/app/utils/fts_setup';
import { AppSchema, ListRecord, LISTS_TABLE, TODOS_TABLE } from '@/library/powersync/AppSchema';
import { SupabaseConnector } from '@/library/powersync/SupabaseConnector';
import { CircularProgress } from '@mui/material';
import { PowerSyncContext } from '@powersync/react';
import {
  ArrayComparator,
  createBaseLogger,
  GetAllQuery,
  IncrementalWatchMode,
  LogLevel,
  PowerSyncDatabase,
  WatchedQuery
} from '@powersync/web';
import React, { Suspense } from 'react';
import { NavigationPanelContextProvider } from '../navigation/NavigationPanelContext';

const SupabaseContext = React.createContext<SupabaseConnector | null>(null);
export const useSupabase = () => React.useContext(SupabaseContext);

export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'example.db'
  }
});

export type EnhancedListRecord = ListRecord & { total_tasks: number; completed_tasks: number };

export type QueryStore = {
  lists: WatchedQuery<EnhancedListRecord[]>;
};

const QueryStore = React.createContext<QueryStore | null>(null);
export const useQueryStore = () => React.useContext(QueryStore);

export const SystemProvider = ({ children }: { children: React.ReactNode }) => {
  const [connector] = React.useState(() => new SupabaseConnector());
  const [powerSync] = React.useState(db);

  const [queryStore] = React.useState<QueryStore>(() => {
    const listsQuery = db.incrementalWatch({ mode: IncrementalWatchMode.COMPARISON }).build({
      comparator: new ArrayComparator({
        compareBy: (item) => JSON.stringify(item)
      }),
      watch: {
        // This provides instant caching of the query results.
        // SQLite calls are asynchronous - therefore on page refresh the placeholder data will be used until the query is resolved.
        // This uses localStorage to synchronously display a cached version while loading.
        // Note that the TodoListsWidget is wraped by a GuardBySync component, which will prevent rendering until the query is resolved.
        // Disable GuardBySync to see the placeholder data in action.
        placeholderData: JSON.parse(localStorage.getItem('listscache') ?? '[]') as EnhancedListRecord[],
        query: new GetAllQuery<EnhancedListRecord>({
          sql: /* sql */ `
            SELECT
              ${LISTS_TABLE}.*,
              COUNT(${TODOS_TABLE}.id) AS total_tasks,
              SUM(
                CASE
                  WHEN ${TODOS_TABLE}.completed = true THEN 1
                  ELSE 0
                END
              ) as completed_tasks
            FROM
              ${LISTS_TABLE}
              LEFT JOIN ${TODOS_TABLE} ON ${LISTS_TABLE}.id = ${TODOS_TABLE}.list_id
            GROUP BY
              ${LISTS_TABLE}.id;
          `
        })
      }
    });

    // This updates a cache in order to display results instantly on page load.
    listsQuery.subscribe({
      onData: (data) => {
        // Store the data in localStorage for instant caching
        localStorage.setItem('listscache', JSON.stringify(data));
      }
    });

    return {
      lists: listsQuery
    };
  });

  React.useEffect(() => {
    const logger = createBaseLogger();
    logger.useDefaults(); // eslint-disable-line
    logger.setLevel(LogLevel.DEBUG);
    // For console testing purposes
    (window as any)._powersync = powerSync;

    powerSync.init();
    const l = connector.registerListener({
      initialized: () => {},
      sessionStarted: () => {
        powerSync.connect(connector);
      }
    });

    connector.init();

    // Demo using SQLite Full-Text Search with PowerSync.
    // See https://docs.powersync.com/usage-examples/full-text-search for more details
    configureFts();

    return () => l?.();
  }, [powerSync, connector]);

  return (
    <Suspense fallback={<CircularProgress />}>
      <QueryStore.Provider value={queryStore}>
        <PowerSyncContext.Provider value={powerSync}>
          <SupabaseContext.Provider value={connector}>
            <NavigationPanelContextProvider>{children}</NavigationPanelContextProvider>
          </SupabaseContext.Provider>
        </PowerSyncContext.Provider>
      </QueryStore.Provider>
    </Suspense>
  );
};

export default SystemProvider;
