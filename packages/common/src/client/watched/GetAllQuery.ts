import { CompiledQuery } from '../../types/types.js';
import { WatchCompatibleQuery, WatchExecuteOptions } from './WatchedQuery.js';

/**
 * Options for {@link GetAllQuery}.
 */
export type GetAllQueryOptions = {
  sql: string;
  parameters?: ReadonlyArray<unknown>;
};

/**
 * Performs a {@link AbstractPowerSyncDatabase.getAll} operation for a watched query.
 */
export class GetAllQuery<RowType = unknown> implements WatchCompatibleQuery<RowType[]> {
  constructor(protected options: GetAllQueryOptions) {}

  compile(): CompiledQuery {
    return {
      sql: this.options.sql,
      parameters: this.options.parameters ?? []
    };
  }

  execute(options: WatchExecuteOptions): Promise<RowType[]> {
    const { db, sql, parameters } = options;
    return db.getAll<RowType>(sql, parameters);
  }
}
