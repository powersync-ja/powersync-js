import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AbstractPowerSyncDatabase } from '@powersync/common';
import { type CompiledQuery } from 'kysely';
import * as SUT from '../../src/sqlite/sqlite-connection';
import { getPowerSyncDb } from '../setup/db';

describe('PowerSyncConnection', () => {
  let powerSyncConnection: SUT.PowerSyncConnection;
  let powerSyncDb: AbstractPowerSyncDatabase;

  describe('executeQuery', () => {
    beforeEach(() => {
      powerSyncDb = getPowerSyncDb();
      powerSyncConnection = new SUT.PowerSyncConnection(powerSyncDb);
    });

    afterEach(async () => {
      await powerSyncDb.disconnectAndClear();
      await powerSyncDb.close();
    });

    it('should execute a select query using getAll from the table', async () => {
      await powerSyncDb.execute('INSERT INTO users (id, name) VALUES(uuid(), ?)', ['John']);
      const getAllSpy = vi.spyOn(powerSyncDb, 'getAll');

      const compiledQuery: CompiledQuery = {
        sql: 'SELECT * From users',
        parameters: [],
        query: { kind: 'SelectQueryNode' }
      };

      const result = await powerSyncConnection.executeQuery(compiledQuery);
      const rows = result.rows as any;

      expect(rows.length).toEqual(1);
      expect(rows[0].name).toEqual('John');
      expect(getAllSpy).toHaveBeenCalledWith('SELECT * From users', []);
    });

    it('should insert to the table', async () => {
      const usersBeforeInsert = await powerSyncDb.getAll('SELECT * FROM users');

      expect(usersBeforeInsert.length).toEqual(0);

      const compiledQuery: CompiledQuery = {
        sql: 'INSERT INTO users (id, name) VALUES(uuid(), ?)',
        parameters: ['John'],
        query: { kind: 'InsertQueryNode' } as any
      };

      await powerSyncConnection.executeQuery(compiledQuery);
      const usersAfterInsert = await powerSyncDb.getAll('SELECT * FROM users');

      expect(usersAfterInsert.length).toEqual(1);
    });

    it('should delete from the table', async () => {
      await powerSyncDb.execute('INSERT INTO users (id, name) VALUES(uuid(), ?)', ['John']);
      const usersBeforeDelete = await powerSyncDb.getAll('SELECT * FROM users');

      expect(usersBeforeDelete.length).toEqual(1);

      const compiledQuery: CompiledQuery = {
        sql: 'DELETE FROM users where name = ?',
        parameters: ['John'],
        query: { kind: 'DeleteQueryNode' } as any
      };

      await powerSyncConnection.executeQuery(compiledQuery);
      const usersAfterDelete = await powerSyncDb.getAll('SELECT * FROM users');

      expect(usersAfterDelete.length).toEqual(0);
    });

    it('should update the table', async () => {
      await powerSyncDb.execute('INSERT INTO users (id, name) VALUES(uuid(), ?)', ['John']);
      const usersBeforeDelete = await powerSyncDb.getAll('SELECT * FROM users');

      expect(usersBeforeDelete.length).toEqual(1);

      const compiledQuery: CompiledQuery = {
        sql: 'DELETE FROM users where name = ?',
        parameters: ['John'],
        query: { kind: 'UpdateQueryNode' } as any
      };

      await powerSyncConnection.executeQuery(compiledQuery);
      const usersAfterDelete = await powerSyncDb.getAll('SELECT * FROM users');

      expect(usersAfterDelete.length).toEqual(0);
    });
  });

  describe('streamQuery', () => {
    beforeEach(() => {
      powerSyncDb = getPowerSyncDb();
      powerSyncConnection = new SUT.PowerSyncConnection(powerSyncDb);
    });

    afterEach(async () => {
      await powerSyncDb.disconnectAndClear();
      await powerSyncDb.close();
    });
    it('should stream query results', async () => {
      await powerSyncDb.execute('INSERT INTO users (id, name) VALUES(uuid(), ?)', ['John']);

      const compiledQuery: CompiledQuery = {
        sql: 'SELECT * From users',
        parameters: [],
        query: { kind: 'SelectQueryNode' }
      };

      const result = await powerSyncConnection.streamQuery(compiledQuery).next();
      const rows = result.value.rows;

      expect(rows.length).toEqual(1);
    });
  });
});
