import { describe, expect, it } from 'vitest';

import { isObservedColumn, ObservedSchema } from '../src/observed-schema';

describe('isObservedColumn', () => {
  it('accepts the core SchemaChange payload and nothing else', () => {
    expect(isObservedColumn({ table: 'todos', column: 'title', value_type: 'String' })).toBe(true);
    expect(isObservedColumn({ table: 'todos', column: 'title', value_type: 'Blob' })).toBe(false);
    expect(isObservedColumn({ table: 'todos', column: 1, value_type: 'String' })).toBe(false);
    expect(isObservedColumn(null)).toBe(false);
  });
});

describe('ObservedSchema', () => {
  it('reports a change for new tables and columns but not for repeats', () => {
    const schema = new ObservedSchema();

    expect(schema.observe({ table: 'todos', column: 'id', value_type: 'String' })).toBe(true);
    expect(schema.observe({ table: 'todos', column: 'title', value_type: 'String' })).toBe(true);
    expect(schema.observe({ table: 'todos', column: 'title', value_type: 'String' })).toBe(false);
    expect(schema.observe({ table: 'todos', column: 'id', value_type: 'String' })).toBe(false);
    expect(schema.tableNames).toEqual(['todos']);
  });

  it('widens column types as mixed values arrive', () => {
    const schema = new ObservedSchema();
    schema.observe({ table: 't', column: 'n', value_type: 'Null' });
    schema.observe({ table: 't', column: 'n', value_type: 'Integer' });
    schema.observe({ table: 't', column: 'n', value_type: 'Real' });
    schema.observe({ table: 't', column: 's', value_type: 'Integer' });
    schema.observe({ table: 't', column: 's', value_type: 'String' });

    const [table] = schema.toSchema().tables;
    const types = Object.fromEntries(table!.columns.map((column) => [column.name, column.type]));
    expect(types).toEqual({ n: 'REAL', s: 'TEXT' });
  });

  it('leaves the implicit id column out of the generated table', () => {
    const schema = new ObservedSchema();
    schema.observe({ table: 'lists', column: 'id', value_type: 'String' });
    schema.observe({ table: 'lists', column: 'name', value_type: 'String' });

    const [table] = schema.toSchema().tables;
    expect(table!.name).toBe('lists');
    expect(table!.columns.map((column) => column.name)).toEqual(['name']);
  });

  it('recovers a table from a row the database already held', () => {
    const schema = new ObservedSchema();

    expect(
      schema.observeStoredRow(
        'todos',
        JSON.stringify({ id: 'a', title: 'Buy milk', done: true, position: 1, weight: 1.5, note: null })
      )
    ).toBe(true);
    // Nothing new the second time round, so no schema is applied for it.
    expect(schema.observeStoredRow('todos', JSON.stringify({ id: 'b', title: 'Walk', done: false }))).toBe(false);

    const [table] = schema.toSchema().tables;
    const types = Object.fromEntries(table!.columns.map((column) => [column.name, column.type]));
    expect(types).toEqual({ title: 'TEXT', done: 'INTEGER', position: 'INTEGER', weight: 'REAL', note: 'TEXT' });
  });

  it('ignores stored data it cannot read as a row', () => {
    const schema = new ObservedSchema();

    expect(schema.observeStoredRow('todos', 'not json')).toBe(false);
    expect(schema.observeStoredRow('todos', '[1, 2]')).toBe(false);
    expect(schema.tableNames).toEqual([]);
  });
});
