import { AbstractPowerSyncDatabase, column, Schema, Table } from '@powersync/common';
import { PowerSyncDatabase } from '@powersync/web';
import { eq, relations } from 'drizzle-orm';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as SUT from '../../src/sqlite/PowerSyncSQLiteDatabase';

const users = new Table({
  name: column.text
});

const posts = new Table({
  content: column.text,
  title: column.text,
  user_id: column.text
});

const drizzleUsers = sqliteTable('users', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull()
});

const drizzlePosts = sqliteTable('posts', {
  id: text('id').primaryKey().notNull(),
  content: text('content').notNull(),
  title: text('title').notNull(),
  user_id: text('user_id')
    .notNull()
    .references(() => drizzleUsers.id)
});

// Define relationships
const usersRelations = relations(drizzleUsers, ({ one, many }) => ({
  posts: many(drizzlePosts) // One user has many posts
}));

const postsRelations = relations(drizzlePosts, ({ one }) => ({
  user: one(drizzleUsers, {
    fields: [drizzlePosts.user_id], // Foreign key in posts
    references: [drizzleUsers.id] // Primary key in users
  })
}));

const PsSchema = new Schema({ users, posts });
// const DrizzleSchema = { users: drizzleUsers, posts: drizzlePosts };
const DrizzleSchema = { users: drizzleUsers, posts: drizzlePosts, usersRelations, postsRelations };

describe('Relationship tests', () => {
  let powerSyncDb: AbstractPowerSyncDatabase;
  let db: SUT.PowerSyncSQLiteDatabase<typeof DrizzleSchema>;

  beforeEach(async () => {
    powerSyncDb = new PowerSyncDatabase({
      database: {
        dbFilename: 'test.db'
      },
      schema: PsSchema
    });
    db = SUT.wrapPowerSyncWithDrizzle(powerSyncDb, { schema: DrizzleSchema, logger: { logQuery: () => {} } });

    await powerSyncDb.init();

    await db.insert(drizzleUsers).values({ id: '1', name: 'Alice' });
    await db.insert(drizzlePosts).values({ id: '33', content: 'Post content', title: 'Post title', user_id: '1' });
  });

  afterEach(async () => {
    await powerSyncDb?.disconnectAndClear();
  });

  it('should retrieve a user with posts', async () => {
    const result = await db.query.users.findMany({ with: { posts: true } });

    expect(result).toEqual([
      { id: '1', name: 'Alice', posts: [{ id: '33', content: 'Post content', title: 'Post title', user_id: '1' }] }
    ]);
  });

  it('should retrieve a post with its user', async () => {
    const result = await db.query.posts.findMany({ with: { user: true } });

    expect(result).toEqual([
      {
        id: '33',
        content: 'Post content',
        title: 'Post title',
        user_id: '1',
        user: { id: '1', name: 'Alice' }
      }
    ]);
  });

  it('should return a user and posts using leftJoin', async () => {
    const result = await db
      .select()
      .from(drizzleUsers)
      .leftJoin(drizzlePosts, eq(drizzleUsers.id, drizzlePosts.user_id));

    expect(result[0].users).toEqual({ id: '1', name: 'Alice' });
    expect(result[0].posts).toEqual({ id: '33', content: 'Post content', title: 'Post title', user_id: '1' });
  });

  it('should return a user and posts using rightJoin', async () => {
    const result = await db
      .select()
      .from(drizzleUsers)
      .rightJoin(drizzlePosts, eq(drizzleUsers.id, drizzlePosts.user_id));

    expect(result[0].users).toEqual({ id: '1', name: 'Alice' });
    expect(result[0].posts).toEqual({ id: '33', content: 'Post content', title: 'Post title', user_id: '1' });
  });

  it('should return a user and posts using fullJoin', async () => {
    const result = await db
      .select()
      .from(drizzleUsers)
      .fullJoin(drizzlePosts, eq(drizzleUsers.id, drizzlePosts.user_id));

    expect(result[0].users).toEqual({ id: '1', name: 'Alice' });
    expect(result[0].posts).toEqual({ id: '33', content: 'Post content', title: 'Post title', user_id: '1' });
  });
});
