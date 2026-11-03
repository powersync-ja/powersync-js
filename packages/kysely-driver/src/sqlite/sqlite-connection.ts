import type { CommonPowerSyncDatabase, Transaction } from '@powersync/common';
import { CompiledQuery, DatabaseConnection, QueryResult } from 'kysely';

/**
 * Represent a Kysely connection to the PowerSync database.
 *
 * The actual locks are acquired on-demand when a transaction is started.
 *
 * When not using transactions, we rely on the automatic locks.
 *
 * This allows us to bypass write locks when doing pure select queries outside a transaction.
 */
export class PowerSyncConnection implements DatabaseConnection {
  readonly #db: CommonPowerSyncDatabase;
  #completeOuterTransaction: (() => void) | null = null;
  #failOuterTransaction: ((error: unknown) => void) | null = null;
  #tx: Transaction | null;

  constructor(db: CommonPowerSyncDatabase) {
    this.#db = db;
    this.#tx = null;
  }

  async executeQuery<O>(compiledQuery: CompiledQuery): Promise<QueryResult<O>> {
    const { sql, parameters, query } = compiledQuery;

    const context = this.#tx ?? this.#db;

    if (query.kind === 'SelectQueryNode') {
      // Optimizaton: use getAll() instead of execute() if it's a select query
      const rows = await context.getAll(sql, parameters as unknown[]);
      return {
        rows: rows as O[]
      };
    }

    const result = await context.execute(sql, parameters as unknown[]);

    return {
      insertId: result.insertId ? BigInt(result.insertId!) : undefined,
      numAffectedRows: BigInt(result.rowsAffected ?? 0),
      rows: result.rows?._array ?? []
    };
  }

  async *streamQuery<R>(compiledQuery: CompiledQuery): AsyncIterableIterator<QueryResult<R>> {
    // Not actually streamed
    const results = await this.executeQuery<R>(compiledQuery);
    yield {
      rows: results.rows
    };
  }

  async beginTransaction(): Promise<void> {
    // TODO: Check if there is already an active transaction?

    /**
     * Returns a promise which resolves once a transaction has been started.
     * Rejects if any errors occur in obtaining the lock.
     */
    return new Promise<void>((resolve, reject) => {
      /**
       * Starts a transaction, resolves the `beginTransaction` promise
       * once it's started. The transaction waits until the `this.#release`
       * callback is executed.
       */
      this.#db
        .writeTransaction(async (tx) => {
          // Set the current active transaction
          this.#tx = tx;

          // Wait for this transaction to be completed.
          // Rejecting causes any uncommitted changes to be rolled back.
          const transactionCompleted = new Promise<void>((resolve, reject) => {
            this.#completeOuterTransaction = resolve;
            this.#failOuterTransaction = reject;
          });

          // Allow this transaction to be used externally
          resolve();

          await transactionCompleted;
        })
        .catch(reject);
    });
  }

  async commitTransaction(): Promise<void> {
    if (!this.#tx) {
      throw new Error('Transaction is not defined');
    }

    try {
      await this.#tx.commit();
    } catch (e) {
      // A failed COMMIT may leave the transaction open. Rejecting makes writeTransaction roll it back
      // before releasing the write lock.
      this.#completeError(e);
      throw e;
    }
    this.#complete();
  }

  async rollbackTransaction(): Promise<void> {
    if (!this.#tx) {
      // Kysely calls this after a failed commitTransaction, which already handed the rollback to
      // writeTransaction. Throwing here would hide the original COMMIT error.
      return;
    }

    try {
      await this.#tx.rollback();
    } catch (e) {
      // Let writeTransaction retry the rollback so that the changes are never committed.
      this.#completeError(e);
      throw e;
    }
    this.#complete();
  }

  async releaseConnection(): Promise<void> {
    // Kysely releases the connection after every transaction. If the transaction was never committed
    // or rolled back, roll it back here so the write lock does not stay held.
    if (this.#tx) {
      try {
        await this.#tx.rollback();
        this.#complete();
      } catch (e) {
        // Let writeTransaction retry the rollback. If the transaction is already over, that's a no-op.
        this.#completeError(e);
      }
    }
  }

  #complete() {
    this.#completeOuterTransaction?.();
    this.#markOuterTransactionReleased();
  }

  #completeError(cause: unknown) {
    this.#failOuterTransaction?.(cause);
    this.#markOuterTransactionReleased();
  }

  #markOuterTransactionReleased() {
    this.#completeOuterTransaction = null;
    this.#failOuterTransaction = null;
    this.#tx = null;
  }
}
