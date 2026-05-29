import { AppSchema } from '@/library/powersync/AppSchema';
import { ListRecord, ListsDeserializationSchema, ListsSchema } from '@/library/powersync/ListsSchema';
import { SupabaseConnector } from '@/library/powersync/SupabaseConnector';
import { TodosDeserializationSchema, TodosSchema } from '@/library/powersync/TodosSchema';
import { CircularProgress } from '@mui/material';
import { PowerSyncContext } from '@powersync/react';
import {
  createBaseLogger,
  LogLevel,
  PowerSyncDatabase,
  WASQLiteOpenFactory,
  WASQLiteVFS,
  WatchedAttachmentItem
} from '@powersync/web';
import { createCollection, isNull, liveQueryCollectionOptions, not } from '@tanstack/db';
import { powerSyncCollectionOptions } from '@tanstack/powersync-db-collection';
import React, { Suspense } from 'react';
import { NavigationPanelContextProvider } from '../navigation/NavigationPanelContext';
import { LocalAttachmentStoage, RemoteAttachmentStorage, TanStackDBAttachmentQueue } from './Attachments';

const SupabaseContext = React.createContext<SupabaseConnector | null>(null);
export const useSupabase = () => React.useContext(SupabaseContext);

export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: new WASQLiteOpenFactory({
    dbFilename: 'example-v2.db',
    vfs: WASQLiteVFS.OPFSCoopSyncVFS
  })
});

export const listsCollection = createCollection(
  powerSyncCollectionOptions({
    database: db,
    table: AppSchema.props.lists,
    schema: ListsSchema,
    deserializationSchema: ListsDeserializationSchema,
    onDeserializationError: (error) => {
      // This should be fixed in development
      console.error(`Could not deserialize lists collection! ${error.issues.map((i) => i.message).join(', ')}`);
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
      // This should be fixed in development
      console.error(`Could not deserialize todos collection! ${error.issues.map((i) => i.message).join(', ')}`);
    }
  })
);

// Keep the local only attachment records in sync with TanStackDB
export const attachmentsCollection = createCollection(
  powerSyncCollectionOptions({
    database: db,
    table: AppSchema.props.attachments
  })
);

export const attachmentQueue = new TanStackDBAttachmentQueue({
  db: db, // PowerSync database instance
  attachmentsCollection: attachmentsCollection as any, //TODO better typing,
  localStorage: LocalAttachmentStoage,
  remoteStorage: RemoteAttachmentStorage,

  // Define which attachments exist in your data model
  watchAttachments: async (onUpdate, abortSignal) => {
    const livePhotoIds = createCollection(
      liveQueryCollectionOptions({
        query: (q) =>
          q
            .from({ document: listsCollection })
            .where(({ document }) => not(isNull(document.photo_id)))
            .select(({ document }) => ({
              photo_id: document.photo_id
            }))
      })
    );

    const initialState = await livePhotoIds.stateWhenReady();

    type LivePhotoId = { photo_id: string | null };
    const mapper = (item: Partial<LivePhotoId>) =>
      ({ id: item.photo_id!, fileExtension: 'jpg' }) satisfies WatchedAttachmentItem;

    // report the initial state of all active attachment IDs
    onUpdate(Array.from(initialState.values()).map(mapper));

    // Subscribe for future changes
    livePhotoIds.subscribeChanges((changes) => {
      // we need the wholistic state for at every change
      const allPhotoIds = livePhotoIds.map(mapper);
      onUpdate(allPhotoIds);
    });

    abortSignal.addEventListener(
      'abort',
      () => {
        // Stop the watched operations
        livePhotoIds.cleanup();
      },
      { once: true }
    );
  },

  // Optional configuration
  syncIntervalMs: 30000, // Sync every 30 seconds
  downloadAttachments: true, // Auto-download referenced files
  archivedCacheLimit: 100 // Keep 100 archived files before cleanup
});

attachmentQueue.startSync();

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
