import { CompiledQuery } from '../../types/types.js';
import { WatchCompatibleQuery, WatchExecuteOptions } from './WatchedQuery.js';

/**
 * Options for {@link GetAllQuery}.
 */
export type GetAllQueryOptions<RowType = unknown> = {
  sql: string;
  parameters?: ReadonlyArray<unknown>;
  /**
   * Optional transformer function to convert raw rows into the desired RowType.
   * @example
   * ```typescript
   * (rawRow: Record<string, unknown>) => ({
   *   id: rawRow.id as string,
   *   created_at: new Date(rawRow.created_at),
   * })
   * ```
   */
  transformer?: (rawRow: Record<string, unknown>) => RowType;
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

  async execute(options: WatchExecuteOptions): Promise<RowType[]> {
    const { db, sql, parameters } = options;
    const rawResult = await db.getAll<unknown>(sql, parameters);
    if (this.options.transformer) {
      return rawResult.map(this.options.transformer);
    }
    return rawResult as RowType[];
  }
}
