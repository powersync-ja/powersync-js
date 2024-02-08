import * as Y from 'yjs';

import { b64ToUint8Array, Uint8ArrayTob64 } from '@/library/binary-utils';
import { v4 as uuidv4 } from 'uuid';
import { AbstractPowerSyncDatabase } from '@journeyapps/powersync-sdk-web';
import { ObservableV2 } from 'lib0/observable';

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
  private seenDocUpdates = new Set<string>();
  private abortController = new AbortController();

  constructor(
    public readonly doc: Y.Doc,
    public readonly db: AbstractPowerSyncDatabase,
    public readonly documentId: string
  ) {
    super();

    const updates = db.watch('SELECT * FROM document_updates WHERE document_id = ?', [documentId], {
      signal: this.abortController.signal
    });

    this._storeUpdate = this._storeUpdate.bind(this);
    this.destroy = this.destroy.bind(this);

    let synced = false;

    const watchLoop = async () => {
      for await (let results of updates) {
        if (this.abortController.signal.aborted) {
          break;
        }

        // New data detected in the database
        for (let update of results.rows!._array) {
          // Ignore any updates we've already seen
          if (!this.seenDocUpdates.has(update.id)) {
            this.seenDocUpdates.add(update.id);
            // apply the update from the database to the doc
            const origin = this;
            Y.applyUpdateV2(doc, b64ToUint8Array(update.update_b64), origin);
          }
        }

        if (!synced) {
          synced = true;
          this.emit('synced', []);
        }
      }
    };
    watchLoop();

    doc.on('updateV2', this._storeUpdate);
    doc.on('destroy', this.destroy);
  }

  private async _storeUpdate(update: Uint8Array, origin: any) {
    if (origin === this) {
      // update originated from the database / PowerSync - ignore
      return;
    }
    // update originated from elsewhere - save to the database
    const docUpdateId = uuidv4();
    this.seenDocUpdates.add(docUpdateId);
    await this.db.execute('INSERT INTO document_updates(id, document_id, update_b64) VALUES(?, ?, ?)', [
      docUpdateId,
      this.documentId,
      Uint8ArrayTob64(update)
    ]);
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
    await this.db.execute('DELETE FROM document_updates WHERE document_id = ?', [this.documentId]);
  }
}
