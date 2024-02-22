import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getKyselyDb } from './setup/db';
import { Kysely } from 'kysely';
import { Database } from './setup/types';

describe('CRUD operations', () => {
  let db: Kysely<Database>;

  beforeEach(() => {
    db = getKyselyDb();
  });

  afterEach(async () => {
    await db.destroy();
  });

  it('should insert a user and select that user', async () => {
    await db.insertInto('users').values({ id: '1', name: 'John' }).execute();
    const result = await db.selectFrom('users').selectAll().execute();

    expect(result.length).toEqual(1);
  });

  it('should insert a user and delete that user', async () => {
    await db.insertInto('users').values({ id: '2', name: 'Ben' }).execute();
    await db.deleteFrom('users').where('name', '=', 'Ben').execute();
    const result = await db.selectFrom('users').selectAll().execute();

    expect(result.length).toEqual(0);
  });

  it('should insert a user and update that user', async () => {
    await db.insertInto('users').values({ id: '3', name: 'Lucy' }).execute();
    await db.updateTable('users').where('name', '=', 'Lucy').set('name', 'Lucy Smith').execute();
    const result = await db.selectFrom('users').select('name').executeTakeFirstOrThrow();

    expect(result.name).toEqual('Lucy Smith');
  });
});
