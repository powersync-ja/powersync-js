import { column, Schema, Table } from '@powersync/common';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { describe, expect, it } from 'vitest';
import {
  DrizzleAppSchema,
  DrizzleTableWithPowerSyncOptions,
  toPowerSyncSchema,
  toPowerSyncTable
} from '../../src/utils/schema';

describe('toPowerSyncTable', () => {
  it('basic conversion', () => {
    const lists = sqliteTable('lists', {
      id: text('id').primaryKey(),
      name: text('name').notNull(),
      owner_id: text('owner_id'),
      counter: integer('counter'),
      completion: real('completion')
    });
    const convertedList = toPowerSyncTable(lists);

    const expectedLists = new Table({
      name: column.text,
      owner_id: column.text,
      counter: column.integer,
      completion: column.real
    });

    expect(convertedList).toEqual(expectedLists);
  });

  it('basic conversion class', () => {
    const lists = sqliteTable('lists', {
      id: text('id').primaryKey(),
      name: text('name').notNull(),
      owner_id: text('owner_id'),
      counter: integer('counter'),
      completion: real('completion')
    });
    const convertedList = new DrizzleAppSchema({ lists });

    const a: (typeof convertedList)['types']['lists'] = {
      name: 'd',
      completion: 1,
      counter: 0,
      id: '1',
      owner_id: null
    };
  });

  it('classed based types', () => {
    const lists = sqliteTable('lists', {
      id: text('id').primaryKey(),
      name: text('name').notNull(),
      owner_id: text('owner_id'),
      counter: integer('counter'),
      completion: real('completion')
    });
    const drizzle = new DrizzleAppSchema({ lists });
  });

  it('conversion with index', () => {
    const lists = sqliteTable(
      'lists',
      {
        id: text('id').primaryKey(),
        name: text('name').notNull(),
        owner_id: text('owner_id')
      },
      (lists) => ({
        owner: index('owner').on(lists.owner_id)
      })
    );
    const convertedList = toPowerSyncTable(lists);

    const expectedLists = new Table(
      {
        name: column.text,
        owner_id: column.text
      },
      { indexes: { owner: ['owner_id'] } }
    );

    expect(convertedList).toEqual(expectedLists);
  });

  it('conversion with options', () => {
    const lists = sqliteTable('lists', {
      id: text('id').primaryKey(),
      name: text('name').notNull()
    });

    const convertedList = toPowerSyncTable(lists, { localOnly: true, insertOnly: true, viewName: 'listsView' });

    const expectedLists = new Table(
      {
        name: column.text
      },
      { localOnly: true, insertOnly: true, viewName: 'listsView' }
    );

    expect(convertedList).toEqual(expectedLists);
  });
});

describe('toPowerSyncSchema', () => {
  it('basic conversion', () => {
    const lists = sqliteTable('lists', {
      id: text('id').primaryKey(),
      name: text('name').notNull(),
      owner_id: text('owner_id'),
      counter: integer('counter'),
      completion: real('completion')
    });

    const todos = sqliteTable('todos', {
      id: text('id').primaryKey(),
      list_id: text('list_id').references(() => lists.id),
      description: text('description')
    });

    const drizzleSchema = {
      lists,
      todos
    };
    const convertedSchema = toPowerSyncSchema(drizzleSchema);

    const expectedSchema = new Schema({
      lists: new Table({
        name: column.text,
        owner_id: column.text,
        counter: column.integer,
        completion: column.real
      }),
      todos: new Table({
        list_id: column.text,
        description: column.text
      })
    });

    expect(convertedSchema).toEqual(expectedSchema);
  });

  it('conversion with options', () => {
    const lists = sqliteTable('lists', {
      id: text('id').primaryKey(),
      name: text('name').notNull(),
      owner_id: text('owner_id'),
      counter: integer('counter'),
      completion: real('completion')
    });

    const todos = sqliteTable('todos', {
      id: text('id').primaryKey(),
      list_id: text('list_id').references(() => lists.id),
      description: text('description')
    });

    const drizzleSchemaWithOptions = {
      lists: {
        tableDefinition: lists,
        options: { localOnly: true, insertOnly: true, viewName: 'listsView' }
      } as DrizzleTableWithPowerSyncOptions,
      todos
    };

    const convertedSchema = toPowerSyncSchema(drizzleSchemaWithOptions);

    const expectedSchema = new Schema({
      lists: new Table(
        {
          name: column.text,
          owner_id: column.text,
          counter: column.integer,
          completion: column.real
        },
        { localOnly: true, insertOnly: true, viewName: 'listsView' }
      ),
      todos: new Table({
        list_id: column.text,
        description: column.text
      })
    });

    expect(convertedSchema).toEqual(expectedSchema);
  });

  it('conversion with index', () => {
    const lists = sqliteTable('lists', {
      id: text('id').primaryKey(),
      name: text('name').notNull(),
      owner_id: text('owner_id'),
      counter: integer('counter'),
      completion: real('completion')
    });

    const todos = sqliteTable(
      'todos',
      {
        id: text('id').primaryKey(),
        list_id: text('list_id').references(() => lists.id),
        description: text('description')
      },
      (todos) => ({
        list: index('list').on(todos.list_id)
      })
    );

    const drizzleSchemaWithOptions = {
      lists,
      todos
    };

    const convertedSchema = toPowerSyncSchema(drizzleSchemaWithOptions);

    const expectedSchema = new Schema({
      lists: new Table({
        name: column.text,
        owner_id: column.text,
        counter: column.integer,
        completion: column.real
      }),
      todos: new Table(
        {
          list_id: column.text,
          description: column.text
        },
        { indexes: { list: ['list_id'] } }
      )
    });

    expect(convertedSchema).toEqual(expectedSchema);
  });
});
