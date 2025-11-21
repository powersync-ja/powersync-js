import { configureFts } from '@/app/utils/fts_setup';
import { AppSchema, ListRecord, LISTS_TABLE, TODOS_TABLE } from '@/library/powersync/AppSchema';
import { SupabaseConnector } from '@/library/powersync/SupabaseConnector';
import { CircularProgress } from '@mui/material';
import { PowerSyncContext } from '@powersync/react';
import { createBaseLogger, DifferentialWatchedQuery, LogLevel, PowerSyncDatabase } from '@powersync/web';
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
  lists: DifferentialWatchedQuery<EnhancedListRecord>;
};

const QueryStore = React.createContext<QueryStore | null>(null);
export const useQueryStore = () => React.useContext(QueryStore);

export const SystemProvider = ({ children }: { children: React.ReactNode }) => {
  const [connector] = React.useState(() => new SupabaseConnector());
  const [powerSync] = React.useState(db);

  const [queryStore] = React.useState<QueryStore>(() => {
    const listsQuery = db
      .query<EnhancedListRecord>({
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
      .differentialWatch();

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
        powerSync.connect(connector, {
          appMetadata: {
            app_version: '1.0.0'
          }
        });
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
