import { CompiledQuery } from '../../types/types.js';
import { AbstractPowerSyncDatabase } from '../AbstractPowerSyncDatabase.js';
import { WatchCompatibleQuery } from './WatchedQuery.js';

/**
 * Options for {@link GetAllQuery}.
 */
export type GetAllQueryOptions<RowType = unknown> = {
  sql: string;
  parameters?: ReadonlyArray<unknown>;
  /**
   * Optional mapper function to convert raw rows into the desired RowType.
   * @example
   * ```javascript
   * (rawRow) => ({
   *   id: rawRow.id,
   *   created_at: new Date(rawRow.created_at),
   * })
   * ```
   */
  mapper?: (rawRow: Record<string, unknown>) => RowType;
};

/**
 * Performs a {@link AbstractPowerSyncDatabase.getAll} operation for a watched query.
 */
export class GetAllQuery<RowType = unknown> implements WatchCompatibleQuery<RowType[]> {
  constructor(protected options: GetAllQueryOptions<RowType>) {}

  compile(): CompiledQuery {
    return {
      sql: this.options.sql,
      parameters: this.options.parameters ?? []
    };
  }

  async execute(options: { db: AbstractPowerSyncDatabase }): Promise<RowType[]> {
    const { db } = options;
    const { sql, parameters = [] } = this.compile();
    const rawResult = await db.getAll<unknown>(sql, [...parameters]);
    if (this.options.mapper) {
      return rawResult.map(this.options.mapper);
    }
    return rawResult as RowType[];
  }
}
