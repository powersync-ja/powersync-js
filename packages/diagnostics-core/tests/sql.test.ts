import { describe, expect, it } from 'vitest';

import { MAX_RESULT_ROWS, quoteIdentifier, withAutoLimit } from '../src/sql';

describe('withAutoLimit', () => {
  it('adds a limit when the query has none', () => {
    expect(withAutoLimit('SELECT * FROM ps_oplog')).toEqual({
      sql: `SELECT * FROM ps_oplog LIMIT ${MAX_RESULT_ROWS + 1}`,
      isAutoLimited: true
    });
  });

  it('drops a trailing semicolon so the limit lands on the statement', () => {
    expect(withAutoLimit('SELECT * FROM todos;  ').sql).toBe(`SELECT * FROM todos LIMIT ${MAX_RESULT_ROWS + 1}`);
  });

  it("leaves a query that limits itself alone, whatever the keyword's case", () => {
    expect(withAutoLimit('SELECT * FROM todos LIMIT 10')).toEqual({
      sql: 'SELECT * FROM todos LIMIT 10',
      isAutoLimited: false
    });
    expect(withAutoLimit('select * from todos limit 3').isAutoLimited).toBe(false);
  });

  it('takes the row cap from the caller', () => {
    expect(withAutoLimit('SELECT 1', 10).sql).toBe('SELECT 1 LIMIT 11');
  });
});

describe('quoteIdentifier', () => {
  it('quotes a name and escapes the quotes inside it', () => {
    expect(quoteIdentifier('todos')).toBe('"todos"');
    expect(quoteIdentifier('we"ird')).toBe('"we""ird"');
  });
});
