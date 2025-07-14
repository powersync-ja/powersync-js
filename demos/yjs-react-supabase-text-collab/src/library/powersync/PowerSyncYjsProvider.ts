import * as Y from 'yjs';

import { b64ToUint8Array, Uint8ArrayTob64 } from '@/library/binary-utils';
import { AbstractPowerSyncDatabase } from '@powersync/web';
import { ObservableV2 } from 'lib0/observable';
import { DocumentUpdates } from './AppSchema';

export interface PowerSyncYjsEvents {
  /**
   * Triggered when document contents have been loaded from the database the first time.
   *
   * The document data may not have been synced from the PowerSync service at this point.
   */
  synced: () => void;
}

/**
 * Configure bidirectional sync for a Yjs document with a PowerSync database.
 *
 * Updates are stored in the `document_updates` table in the database.
 *
 * @param ydoc
 * @param db
 * @param documentId
 */
export class PowerSyncYjsProvider extends ObservableV2<PowerSyncYjsEvents> {
  private abortController = new AbortController();

  constructor(
    public readonly doc: Y.Doc,
    public readonly db: AbstractPowerSyncDatabase,
    public readonly documentId: string
  ) {
    super();
    /**
     * Watch for changes to the `document_updates` table for this document.
     * This will be used to apply updates from other editors.
     * When we received an added item we apply the update to the Yjs document.
     */
    const updateQuery = db
      .query<DocumentUpdates>({
        sql: /* sql */ `
          SELECT
            *
          FROM
            document_updates
          WHERE
            document_id = ?
        `,
        parameters: [documentId]
      })
      .differentialWatch();

    this.abortController.signal.addEventListener(
      'abort',
      () => {
        // Stop the watch query when the abort signal is triggered
        updateQuery.close();
      },
      { once: true }
    );

    this._storeUpdate = this._storeUpdate.bind(this);
    this.destroy = this.destroy.bind(this);

    let synced = false;
    const origin = this;
    updateQuery.registerListener({
      onDiff: async (diff) => {
        for (const added of diff.added) {
          /**
           * Local document updates get stored to the database and synced.
           *
           * These updates here originate from syncing remote updates.
           * Applying these updates to YJS should not result in the `storeUpdate`
           * handler creating a new `document_update` record. We mark the origin
           */
          Y.applyUpdateV2(doc, b64ToUint8Array(added.update_b64), origin);
        }
        if (!synced) {
          synced = true;
          this.emit('synced', []);
        }
      },
      onError: (error) => {
        console.error('Error in PowerSyncYjsProvider update query:', error);
      }
    });

    doc.on('updateV2', this._storeUpdate);
    doc.on('destroy', this.destroy);
  }

  private async _storeUpdate(update: Uint8Array, origin: any) {
    if (origin === this) {
      // update originated from the database / PowerSync - ignore
      return;
    }

    await this.db.execute(
      /* sql */ `
        INSERT INTO
          document_updates (id, document_id, update_b64)
        VALUES
          (uuid (), ?, ?)
      `,
      [this.documentId, Uint8ArrayTob64(update)]
    );
  }

  /**
   * Destroy this persistence provider, removing any attached event listeners.
   */
  destroy() {
    this.abortController.abort();
    this.doc.off('updateV2', this._storeUpdate);
    this.doc.off('destroy', this.destroy);
  }

  /**
   * Delete data associated with this document from the database.
   *
   * Also call `destroy()` to remove any event listeners and prevent future updates to the database.
   */
  async deleteData() {
    await this.db.execute(
      /* sql */ `
        DELETE FROM document_updates
        WHERE
          document_id = ?
      `,
      [this.documentId]
    );
  }
}
