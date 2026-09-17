import { describe, expect, it } from 'vitest';

import type { QueryParams, QueryResult } from '../src/shapes';
import {
  hasOperationHistory,
  readBucketStats,
  readSyncedTableNames,
  readTableStats,
  type QueryRunner
} from '../src/tables';

const runner = (rows: Record<string, unknown>[], seen: QueryParams[] = []): QueryRunner => ({
  runQuery: async (params) => {
    seen.push(params);
    const result: QueryResult = { columns: Object.keys(rows[0] ?? {}), rows, rowCount: rows.length };
    return result;
  }
});

describe('hasOperationHistory', () => {
  it('flags a bucket whose operations far outnumber its rows', () => {
    expect(hasOperationHistory(10, 31)).toBe(true);
    expect(hasOperationHistory(10, 30)).toBe(false);
    expect(hasOperationHistory(0, 100)).toBe(false);
  });
});

describe('readSyncedTableNames', () => {
  it('lists the views that are not PowerSync internals', async () => {
    const seen: QueryParams[] = [];
    const names = await readSyncedTableNames(runner([{ name: 'lists' }, { name: 'todos' }], seen));

    expect(names).toEqual(['lists', 'todos']);
    expect(seen[0]?.sql).toContain("type = 'view'");
    expect(seen[0]?.sql).toContain("NOT LIKE 'ps_%'");
  });
});

describe('readTableStats and readBucketStats', () => {
  it('reads numbers SQLite hands over as text', async () => {
    const stats = await readTableStats(runner([{ name: 'todos', rowCount: '3', operationCount: 12, size: '300' }]));

    expect(stats).toEqual([{ name: 'todos', rowCount: 3, operationCount: 12, size: 300 }]);
  });

  it('reads per-bucket stats the same way', async () => {
    const stats = await readBucketStats(runner([{ name: 'todos|0[]', rowCount: 1, operationCount: 1, size: 50 }]));

    expect(stats).toEqual([{ name: 'todos|0[]', rowCount: 1, operationCount: 1, size: 50 }]);
  });

  it('refuses a row it cannot read as stats', async () => {
    await expect(
      readTableStats(runner([{ name: 'todos', rowCount: 'many', operationCount: 1, size: 1 }]))
    ).rejects.toThrow(/rowCount/);
    await expect(readTableStats(runner([{ rowCount: 1, operationCount: 1, size: 1 }]))).rejects.toThrow(/name/);
  });
});
