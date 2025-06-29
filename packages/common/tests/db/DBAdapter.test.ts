import { describe, it, expect } from 'vitest';
import {
  convertToBatchedUpdateNotification,
  convertToUpdateNotifications,
  RowUpdateType,
  UpdateNotification,
  BatchedUpdateNotification,
  TableUpdateOperation
} from '../../src/db/DBAdapter.js';

describe('DBAdapter', () => {
  describe('convertToBatchedUpdateNotification', () => {
    it('should convert empty array to empty batched notification', () => {
      const result = convertToBatchedUpdateNotification([]);

      expect(result).toEqual({
        rawUpdates: [],
        tables: [],
        groupedUpdates: {}
      });
    });

    it('should convert single update notification', () => {
      const updates: UpdateNotification[] = [
        {
          table: 'users',
          opType: RowUpdateType.SQLITE_INSERT,
          rowId: 1
        }
      ];

      const result = convertToBatchedUpdateNotification(updates);

      expect(result.rawUpdates).toEqual(updates);
      expect(result.tables).toEqual(['users']);
      expect(result.groupedUpdates).toEqual({
        users: [updates[0]]
      });
    });

    it('should group multiple updates for same table', () => {
      const updates: UpdateNotification[] = [
        {
          table: 'users',
          opType: RowUpdateType.SQLITE_INSERT,
          rowId: 1
        },
        {
          table: 'users',
          opType: RowUpdateType.SQLITE_UPDATE,
          rowId: 2
        },
        {
          table: 'users',
          opType: RowUpdateType.SQLITE_DELETE,
          rowId: 3
        }
      ];

      const result = convertToBatchedUpdateNotification(updates);

      expect(result.rawUpdates).toEqual(updates);
      expect(result.tables).toEqual(['users']);
      expect(result.groupedUpdates.users).toHaveLength(3);
      expect(result.groupedUpdates.users).toEqual(updates);
    });

    it('should handle updates for multiple tables', () => {
      const updates: UpdateNotification[] = [
        {
          table: 'users',
          opType: RowUpdateType.SQLITE_INSERT,
          rowId: 1
        },
        {
          table: 'posts',
          opType: RowUpdateType.SQLITE_INSERT,
          rowId: 2
        },
        {
          table: 'users',
          opType: RowUpdateType.SQLITE_UPDATE,
          rowId: 3
        },
        {
          table: 'comments',
          opType: RowUpdateType.SQLITE_DELETE,
          rowId: 4
        }
      ];

      const result = convertToBatchedUpdateNotification(updates);

      expect(result.rawUpdates).toEqual(updates);
      expect(result.tables).toHaveLength(3);
      expect(result.tables).toContain('users');
      expect(result.tables).toContain('posts');
      expect(result.tables).toContain('comments');

      expect(result.groupedUpdates.users).toHaveLength(2);
      expect(result.groupedUpdates.users).toEqual([updates[0], updates[2]]);

      expect(result.groupedUpdates.posts).toHaveLength(1);
      expect(result.groupedUpdates.posts).toEqual([updates[1]]);

      expect(result.groupedUpdates.comments).toHaveLength(1);
      expect(result.groupedUpdates.comments).toEqual([updates[3]]);
    });
  });

  describe('convertToUpdateNotifications', () => {
    it('should return empty array for empty batched notification', () => {
      const batchedUpdate: BatchedUpdateNotification = {
        // will be ignored because empty
        rawUpdates: [],
        // will be ignored because empty
        groupedUpdates: {},
        // will be ignored because empty
        tables: []
      };

      const result = convertToUpdateNotifications(batchedUpdate);

      expect(result).toEqual([]);
    });

    it('should return rawUpdates when available', () => {
      const rawUpdates: UpdateNotification[] = [
        {
          table: 'users',
          opType: RowUpdateType.SQLITE_INSERT,
          rowId: 1
        },
        {
          table: 'posts',
          opType: RowUpdateType.SQLITE_UPDATE,
          rowId: 2
        }
      ];

      const batchedUpdate: BatchedUpdateNotification = {
        // will be used as priority
        rawUpdates,
        // will be ignored because rawUpdates is available
        groupedUpdates: {
          comments: [
            {
              opType: RowUpdateType.SQLITE_INSERT,
              rowId: 3
            }
          ]
        },
        // will be ignored because rawUpdates is available
        tables: ['users', 'posts', 'comments']
      };

      const result = convertToUpdateNotifications(batchedUpdate);

      expect(result).toEqual(rawUpdates);
    });

    it('should convert groupedUpdates when rawUpdates is empty', () => {
      const batchedUpdate: BatchedUpdateNotification = {
        // will be ignored because empty
        rawUpdates: [],
        // will be used as priority
        groupedUpdates: {
          users: [
            {
              opType: RowUpdateType.SQLITE_INSERT,
              rowId: 1
            }
          ],
          posts: [
            {
              opType: RowUpdateType.SQLITE_UPDATE,
              rowId: 2
            },
            {
              opType: RowUpdateType.SQLITE_DELETE,
              rowId: 3
            }
          ]
        },
        // will be ignored because groupedUpdates is available
        tables: ['users', 'posts', 'comments']
      };

      const result = convertToUpdateNotifications(batchedUpdate);

      expect(result).toHaveLength(3);
      expect(result).toContainEqual({
        table: 'users',
        opType: RowUpdateType.SQLITE_INSERT,
        rowId: 1
      });
      expect(result).toContainEqual({
        table: 'posts',
        opType: RowUpdateType.SQLITE_UPDATE,
        rowId: 2
      });
      expect(result).toContainEqual({
        table: 'posts',
        opType: RowUpdateType.SQLITE_DELETE,
        rowId: 3
      });
    });

    it('should create minimal notifications from tables when no updates available', () => {
      const batchedUpdate: BatchedUpdateNotification = {
        // will be ignored because empty
        rawUpdates: [],
        // will be ignored because empty
        groupedUpdates: {},
        // will be used as priority
        tables: ['users', 'posts', 'comments']
      };

      const result = convertToUpdateNotifications(batchedUpdate);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ table: 'users' });
      expect(result[1]).toEqual({ table: 'posts' });
      expect(result[2]).toEqual({ table: 'comments' });
    });
  });
});
