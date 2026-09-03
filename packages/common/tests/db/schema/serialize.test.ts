import { describe, it, expect } from 'vitest';
import { Schema } from '../../../src/db/schema/Schema.js';
import { Table } from '../../../src/db/schema/Table.js';
import { column, ColumnType } from '../../../src/db/schema/Column.js';

describe('Schema.serialize', () => {
  it('captures columns with their types', () => {
    const schema = new Schema({
      todos: new Table({ description: column.text, done: column.integer, rank: column.real })
    });

    const [table] = schema.serialize().tables;
    expect(table.columns).toEqual([
      { name: 'description', type: ColumnType.TEXT },
      { name: 'done', type: ColumnType.INTEGER },
      { name: 'rank', type: ColumnType.REAL }
    ]);
  });

  it('captures indexes with per-column ascending, including descending shorthand', () => {
    const schema = new Schema({
      todos: new Table({ priority: column.integer, description: column.text }, { indexes: { by_priority: ['priority', '-description'] } })
    });

    const [table] = schema.serialize().tables;
    expect(table.indexes).toEqual([
      {
        name: 'by_priority',
        columns: [
          { name: 'priority', ascending: true },
          { name: 'description', ascending: false }
        ]
      }
    ]);
  });

  it('captures all table options', () => {
    const schema = new Schema({
      todos: new Table(
        { description: column.text },
        {
          viewName: 'todos_view',
          trackPrevious: { columns: ['description'], onlyWhenChanged: true },
          trackMetadata: true,
          ignoreEmptyUpdates: true
        }
      )
    });

    const [table] = schema.serialize().tables;
    expect(table.name).toBe('todos');
    expect(table.viewName).toBe('todos_view');
    expect(table.viewNameOverride).toBe('todos_view');
    expect(table.trackPrevious).toEqual({ columns: ['description'], onlyWhenChanged: true });
    expect(table.trackMetadata).toBe(true);
    expect(table.ignoreEmptyUpdates).toBe(true);
    expect(table.localOnly).toBe(false);
    expect(table.insertOnly).toBe(false);
  });

  it('omits viewNameOverride when the view name is not overridden', () => {
    const schema = new Schema({ todos: new Table({ description: column.text }) });
    const [table] = schema.serialize().tables;
    expect(table.viewName).toBe('todos');
    expect(table.viewNameOverride).toBeUndefined();
  });

  it('serializes trackPrevious in its boolean form', () => {
    const schema = new Schema({ todos: new Table({ description: column.text }, { trackPrevious: true }) });
    const [table] = schema.serialize().tables;
    expect(table.trackPrevious).toBe(true);
  });

  it('serializes local-only and insert-only flags', () => {
    const schema = new Schema({
      cache: Table.createLocalOnly({ value: column.text }),
      events: Table.createInsertOnly({ value: column.text })
    });
    const serialized = schema.serialize();
    const cache = serialized.tables.find((t) => t.name === 'cache')!;
    const events = serialized.tables.find((t) => t.name === 'events')!;
    expect(cache.localOnly).toBe(true);
    expect(events.insertOnly).toBe(true);
  });

  it('round-trips losslessly through fromSerialized', () => {
    const schema = new Schema({
      todos: new Table(
        { description: column.text, done: column.integer, rank: column.real },
        {
          viewName: 'todos_view',
          indexes: { by_rank: ['rank', '-description'] },
          trackPrevious: { columns: ['description'], onlyWhenChanged: true },
          trackMetadata: true
        }
      ),
      lists: new Table({ title: column.text })
    });

    const serialized = schema.serialize();
    const reserialized = Schema.fromSerialized(serialized).serialize();
    expect(reserialized).toEqual(serialized);
  });
});
