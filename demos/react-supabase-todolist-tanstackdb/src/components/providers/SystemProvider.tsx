import { AppSchema } from '@/library/powersync/AppSchema';
import { ListRecord, ListsDeserializationSchema, ListsSchema } from '@/library/powersync/ListsSchema';
import { SupabaseConnector } from '@/library/powersync/SupabaseConnector';
import { TodosDeserializationSchema, TodosSchema } from '@/library/powersync/TodosSchema';
import { CircularProgress } from '@mui/material';
import { PowerSyncContext } from '@powersync/react';
import { LogLevel, PowerSyncDatabase, createBaseLogger } from '@powersync/web';
import { createCollection } from '@tanstack/db';
import { powerSyncCollectionOptions } from '@tanstack/powersync-db-collection';
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

export const listsCollection = createCollection(
  powerSyncCollectionOptions({
    database: db,
    table: AppSchema.props.lists,
    schema: ListsSchema,
    deserializationSchema: ListsDeserializationSchema,
    onDeserializationError: (error) => {
      // TODO handle deserialization error
    }
  })
);

export const todosCollection = createCollection(
  powerSyncCollectionOptions({
    database: db,
    table: AppSchema.props.todos,
    schema: TodosSchema,
    deserializationSchema: TodosDeserializationSchema,
    onDeserializationError: (error) => {
      // TODO handle deserialization error
    }
  })
);

export type EnhancedListRecord = ListRecord & { total_tasks: number; completed_tasks: number };

export const SystemProvider = ({ children }: { children: React.ReactNode }) => {
  const [connector] = React.useState(() => new SupabaseConnector());
  const [powerSync] = React.useState(db);

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

    return () => l?.();
  }, [powerSync, connector]);

  return (
    <Suspense fallback={<CircularProgress />}>
      <PowerSyncContext.Provider value={powerSync}>
        <SupabaseContext.Provider value={connector}>
          <NavigationPanelContextProvider>{children}</NavigationPanelContextProvider>
        </SupabaseContext.Provider>
      </PowerSyncContext.Provider>
    </Suspense>
  );
};

export default SystemProvider;
