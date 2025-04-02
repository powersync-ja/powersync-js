import { describe, expect, it } from 'vitest';
import { ConnectedDatabaseUtils, generateConnectedDatabase } from './utils/generateConnectedDatabase';

const UPLOAD_TIMEOUT_MS = 3000;

describe(
  'Sync Status when streaming',
  { sequential: true },
  describeSyncStatusStreamingTests(() =>
    generateConnectedDatabase({
      powerSyncOptions: {
        flags: {
          useWebWorker: false,
          enableMultiTabs: false
        }
      }
    })
  )
);

function describeSyncStatusStreamingTests(createConnectedDatabase: () => Promise<ConnectedDatabaseUtils>) {
  return () => {
    it('Should have downloadError on stream failure', async () => {
      const { powersync, waitForStream, remote, connector } = await createConnectedDatabase();
      remote.errorOnStreamStart = true;

      // Making sure the field change takes effect
      const newStream = waitForStream();
      remote.streamController?.close();
      await newStream;

      let resolveDownloadError: () => void;
      const downloadErrorPromise = new Promise<void>((resolve) => {
        resolveDownloadError = resolve;
      });
      let receivedUploadError = false;

      powersync.registerListener({
        statusChanged: (status) => {
          if (status.dataFlowStatus.downloadError) {
            resolveDownloadError();
            receivedUploadError = true;
          }
        }
      });

      // Download error should be specified
      await downloadErrorPromise;
    });

    it('Should have uploadError on failed uploads', async () => {
      const { powersync, uploadSpy } = await createConnectedDatabase();
      expect(powersync.connected).toBe(true);

      let uploadCounter = 0;
      // This test will throw an exception a few times before successfully uploading
      const throwCounter = 2;
      uploadSpy.mockImplementation(async (db) => {
        if (uploadCounter++ < throwCounter) {
          throw new Error(`Force upload error`);
        }
        // Now actually do the upload
        const tx = await db.getNextCrudTransaction();
        await tx?.complete();
      });

      let resolveUploadError: () => void;
      const uploadErrorPromise = new Promise<void>((resolve) => {
        resolveUploadError = resolve;
      });
      let receivedUploadError = false;

      let resolveClearedUploadError: () => void;
      const clearedUploadErrorPromise = new Promise<void>((resolve) => {
        resolveClearedUploadError = resolve;
      });

      powersync.registerListener({
        statusChanged: (status) => {
          if (status.dataFlowStatus.uploadError) {
            resolveUploadError();
            receivedUploadError = true;
          } else if (receivedUploadError) {
            resolveClearedUploadError();
          }
        }
      });

      // do something which should trigger an upload
      await powersync.execute('INSERT INTO users (id, name) VALUES (uuid(), ?)', ['name']);

      // Upload error should be specified
      await uploadErrorPromise;

      // Upload error should be cleared after successful upload
      await clearedUploadErrorPromise;
    });
  };
}
