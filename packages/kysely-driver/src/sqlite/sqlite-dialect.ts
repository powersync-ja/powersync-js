import {
  DatabaseIntrospector,
  Dialect,
  DialectAdapter,
  Driver,
  Kysely,
  QueryCompiler,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler
} from 'kysely';
import { PowerSyncDialectConfig, PowerSyncDriver } from './sqlite-driver';

export class PowerSyncDialect implements Dialect {
  readonly #config: PowerSyncDialectConfig;

  constructor(config: PowerSyncDialectConfig) {
    this.#config = Object.freeze({ ...config });
  }

  createDriver(): Driver {
    return new PowerSyncDriver(this.#config);
  }

  createQueryCompiler(): QueryCompiler {
    return new SqliteQueryCompiler();
  }

  createAdapter(): DialectAdapter {
    return new SqliteAdapter();
  }

  createIntrospector(db: Kysely<unknown>): DatabaseIntrospector {
    return new SqliteIntrospector(db);
  }
}
