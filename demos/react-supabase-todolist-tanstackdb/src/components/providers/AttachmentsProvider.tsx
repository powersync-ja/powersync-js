import { SupabaseRemoteStorageAdapter } from '@/library/storage/SupabaseRemoteStorageAdapter';
import { AttachmentRecord, WatchedAttachmentItem } from '@powersync/web';
import { createCollection, isNull, liveQueryCollectionOptions, not } from '@tanstack/db';
import { powerSyncCollectionOptions } from '@tanstack/powersync-db-collection';
import React from 'react';
import { AppSchema } from '@/library/powersync/AppSchema';
import { LocalAttachmentStoage, TanStackDBAttachmentQueue } from './Attachments';
import { connector, db, listsCollection } from './SystemProvider';

export const attachmentsEnabled = !!connector.config.supabaseBucket;

// The connector owns the authenticated Supabase client, which the remote
// storage adapter reuses to upload/download/delete attachments.
export const RemoteAttachmentStorage = new SupabaseRemoteStorageAdapter({
  client: connector.client,
  bucket: connector.config.supabaseBucket
});

// Keep the local only attachment records in sync with TanStackDB.
// This is a plain mirror of the local attachments table, so it is harmless when
// attachments are disabled — the table simply stays empty.
export const attachmentsCollection = createCollection(
  powerSyncCollectionOptions({
    database: db,
    table: AppSchema.props.attachments
  })
);

export const attachmentQueue = new TanStackDBAttachmentQueue({
  db: db,
  attachmentsCollection: attachmentsCollection,
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
    livePhotoIds.subscribeChanges(() => {
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

  errorHandler: {
    onDownloadError: async (_attachment: AttachmentRecord, error: Error) => {
      // Object not found - the file no longer exists remotely, so don't retry.
      if (error.toString().includes('Object not found')) {
        return false;
      }
      return true; // Retry other download errors (e.g. transient network failures).
    },
    onUploadError: async () => true, // Retry uploads by default.
    onDeleteError: async () => true // Retry deletes by default.
  }
});

export type AttachmentsContextValue = {
  queue: TanStackDBAttachmentQueue;
};

const AttachmentsContext = React.createContext<AttachmentsContextValue | null>(null);

/**
 * Exposes the attachment queue when a Supabase bucket is configured.
 * Returns `null` when attachments are disabled, so consumers can degrade
 * gracefully (e.g. create lists without a photo).
 */
export const useAttachments = () => React.useContext(AttachmentsContext);

export const AttachmentsProvider = ({ children }: { children: React.ReactNode }) => {
  React.useEffect(() => {
    if (!attachmentsEnabled) {
      console.warn('VITE_SUPABASE_BUCKET is not set.');
      return;
    }

    attachmentQueue.startSync();
    return () => {
      attachmentQueue.stopSync();
    };
  }, []);

  return (
    <AttachmentsContext.Provider value={attachmentsEnabled ? { queue: attachmentQueue } : null}>
      {children}
    </AttachmentsContext.Provider>
  );
};

export default AttachmentsProvider;
