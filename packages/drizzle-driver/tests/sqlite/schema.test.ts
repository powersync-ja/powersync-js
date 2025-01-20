import { column, Schema, Table } from '@powersync/common';
import { customType, index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { describe, expect, it } from 'vitest';
import { DrizzleAppSchema, DrizzleTableWithPowerSyncOptions, toPowerSyncTable } from '../../src/utils/schema';
import { CasingCache } from 'drizzle-orm/casing';

describe('toPowerSyncTable', () => {
  it('basic conversion', () => {
    const lists = sqliteTable('lists', {
      id: text('id').primaryKey(),
      name: text('name').notNull(),
      info: text('info', { mode: 'json' }),
      owner_id: text('owner_id'),
      counter: integer('counter'),
      completion: real('completion'),
      verified: integer('verified', { mode: 'boolean' }),
      created_at: integer('created_at', { mode: 'timestamp' }),
      updated_at: integer('updated_at', { mode: 'timestamp_ms' })
    });
    const convertedList = toPowerSyncTable(lists);

    const expectedLists = new Table({
      name: column.text,
      info: column.text,
      owner_id: column.text,
      counter: column.integer,
      completion: column.real,
      verified: column.integer,
      created_at: column.integer,
      updated_at: column.integer
    });

    expect(convertedList).toEqual(expectedLists);
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

    const convertedList = toPowerSyncTable(lists, {
      localOnly: true,
      insertOnly: true,
      viewName: 'listsView'
    });

    const expectedLists = new Table(
      {
        name: column.text
      },
      { localOnly: true, insertOnly: true, viewName: 'listsView' }
    );

    expect(convertedList).toEqual(expectedLists);
  });

  it('conversion with casing', () => {
    const lists = sqliteTable(
      'lists',
      {
        id: text('id').primaryKey(),
        myName: text().notNull(),
        yourName: text('yourName').notNull() // explicitly set casing
      },
      (lists) => ({
        names: index('names').on(lists.myName, lists.yourName)
      })
    );

    const convertedList = toPowerSyncTable(lists, { casingCache: new CasingCache('snake_case') });

    const expectedLists = new Table(
      {
        my_name: column.text,
        yourName: column.text
      },
      { indexes: { names: ['my_name', 'yourName'] } }
    );

    expect(convertedList).toEqual(expectedLists);
  });

  it('custom column conversion', () => {
    const customSqliteText = customType<{ data: string; driverData: string }>({
      dataType() {
        return 'text';
      },
      fromDriver(value) {
        return value;
      },
      toDriver(value) {
        return value;
      }
    });

    const customSqliteInteger = customType<{ data: number; driverData: number }>({
      dataType() {
        return 'integer';
      },
      fromDriver(value) {
        return Number(value);
      },
      toDriver(value) {
        return value;
      }
    });

    const customSqliteReal = customType<{ data: number; driverData: number }>({
      dataType() {
        return 'real';
      },
      fromDriver(value) {
        return Number(value);
      },
      toDriver(value) {
        return value;
      }
    });

    const lists = sqliteTable('lists', {
      id: text('id').primaryKey(),
      text_col: customSqliteText('text_col'),
      int_col: customSqliteInteger('int_col'),
      real_col: customSqliteReal('real_col')
    });

    const convertedList = toPowerSyncTable(lists);

    const expectedLists = new Table({
      text_col: column.text,
      int_col: column.integer,
      real_col: column.real
    });

    expect(convertedList).toEqual(expectedLists);
  });
});

describe('DrizzleAppSchema constructor', () => {
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

    const convertedSchema = new DrizzleAppSchema(drizzleSchema);

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

    expect(convertedSchema.tables).toEqual(expectedSchema.tables);
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

    const convertedSchema = new DrizzleAppSchema(drizzleSchemaWithOptions);

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

    expect(convertedSchema.tables).toEqual(expectedSchema.tables);
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

    const convertedSchema = new DrizzleAppSchema(drizzleSchemaWithOptions);

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

    expect(convertedSchema.tables).toEqual(expectedSchema.tables);
  });

  it('conversion with casing', () => {
    const lists = sqliteTable(
      'lists',
      {
        id: text('id').primaryKey(),
        myName: text().notNull(),
        yourName: text('yourName').notNull() // explicitly set casing
      },
      (lists) => ({
        names: index('names').on(lists.myName, lists.yourName)
      })
    );

    const drizzleSchemaWithOptions = {
      lists
    };

    const convertedSchema = new DrizzleAppSchema(drizzleSchemaWithOptions, { casing: 'snake_case' });

    const expectedSchema = new Schema({
      lists: new Table(
        {
          my_name: column.text,
          yourName: column.text
        },
        { indexes: { names: ['my_name', 'yourName'] } }
      )
    });

    expect(convertedSchema.tables).toEqual(expectedSchema.tables);
  });
});
