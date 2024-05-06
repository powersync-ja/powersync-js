import { type AbstractPowerSyncDatabase, type Transaction } from '@powersync/common';
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
  readonly #db: AbstractPowerSyncDatabase;
  #completeTransaction: (() => void) | null;
  #tx: Transaction | null;

  constructor(db: AbstractPowerSyncDatabase) {
    this.#db = db;
    this.#tx = null;
    this.#completeTransaction = null;
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
      numAffectedRows: BigInt(result.rowsAffected),
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

          /**
           * Wait for this transaction to be completed
           * Rejecting would cause any uncommitted changes to be
           * rolled back.
           */
          const transactionCompleted = new Promise<void>((resolve) => {
            this.#completeTransaction = resolve;
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

    await this.#tx.commit();
    this.releaseTransaction();
  }

  async rollbackTransaction(): Promise<void> {
    if (!this.#tx) {
      throw new Error('Transaction is not defined');
    }

    await this.#tx.rollback();
    this.releaseTransaction();
  }

  async releaseConnection(): Promise<void> {}

  private releaseTransaction() {
    if (!this.#completeTransaction) {
      throw new Error(`Not able to release transaction`);
    }

    this.#completeTransaction();
    this.#completeTransaction = null;
    this.#tx = null;
  }
}
