import { type AbstractPowerSyncDatabase, type Transaction } from '@journeyapps/powersync-sdk-web';
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
  #release?: () => void;
  #tx?: Transaction;

  constructor(db: AbstractPowerSyncDatabase) {
    this.#db = db;
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
    let doResolve: any;
    let doReject: any;
    let doRelease: any;

    const lockPromise = new Promise<PowerSyncConnection>((resolve, reject) => {
      doResolve = resolve;
      doReject = reject;
    });

    this.#db
      .writeTransaction(async (tx) => {
        this.#tx = tx;
        const releasePromise = new Promise<void>((reject) => {
          doRelease = reject;
        });
        doResolve();
        await releasePromise;
      })
      .catch(doReject);

    await lockPromise;
    this.#release = doRelease;
  }

  async commitTransaction(): Promise<void> {
    if (!this.#tx) {
      throw new Error('Transaction is not defined');
    }

    if (!this.#release) {
      throw new Error('Release is not defined');
    }

    await this.#tx.commit();
    this.#tx = undefined;
    this.#release();
    this.#release = undefined;
  }

  async rollbackTransaction(): Promise<void> {
    if (!this.#tx) {
      throw new Error('Transaction is not defined');
    }

    if (!this.#release) {
      throw new Error('Release is not defined');
    }

    await this.#tx.rollback();
    this.#tx = undefined;
    this.#release();
    this.#release = undefined;
  }

  async releaseConnection(): Promise<void> {
    // is this write?
    this.#db.disconnect();
  }
}
