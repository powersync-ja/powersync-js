import { describe, expect, it } from 'vitest';

import {
  collectImpersonationTarget,
  readCheckpointBuckets,
  recoverConnectionParams,
  recoverSubscriptions,
  type ServiceLogEntry
} from '../src/impersonation';
import type { SyncConfigStream } from '../src/sync-config';

const RID = 'h/01a08c19-2544-7068-926a-a92db366a06b';
const CLIENT_ID = '3278293a-515c-4d9c-a917-e4f27326750f';

const entry = (fields: Record<string, unknown>): ServiceLogEntry => ({
  message: '',
  rid: RID,
  client_id: CLIENT_ID,
  user_id: 'fsf',
  ...fields
});

/** The lines one sync session produced, as the service logs them. */
const streamStarted = entry({ message: 'Sync stream started', client_params: { list_name: 'renew' } });
const newCheckpoint = entry({
  message:
    'New checkpoint: 464217 | write: null | buckets: 2 | param_results: 0 ["8#migrated_to_streams|0[]","8#lists_by_name_subscription|0[\\"renew\\"]"]'
});
const checkpointComplete = entry({ message: 'checkpoint_complete: 464217' });

const streams: SyncConfigStream[] = [
  {
    name: 'migrated_to_streams',
    isAutoSubscribed: true,
    subscriptionParameterKeys: [],
    connectionParameterKeys: []
  },
  {
    name: 'lists_by_name_connection',
    isAutoSubscribed: true,
    subscriptionParameterKeys: [],
    connectionParameterKeys: ['list_name']
  },
  {
    name: 'lists_by_name_subscription',
    isAutoSubscribed: false,
    subscriptionParameterKeys: ['list_name'],
    connectionParameterKeys: []
  }
];

describe('readCheckpointBuckets', () => {
  it('reads the bucket names off a checkpoint line', () => {
    expect(readCheckpointBuckets(newCheckpoint.message)).toEqual([
      '8#migrated_to_streams|0[]',
      '8#lists_by_name_subscription|0["renew"]'
    ]);
  });

  it('has nothing for a line that carries no bucket list', () => {
    expect(readCheckpointBuckets('Sync stream started')).toEqual([]);
    expect(readCheckpointBuckets('buckets: 2 [not json')).toEqual([]);
    expect(readCheckpointBuckets('numbers [1, 2]')).toEqual([]);
  });
});

describe('collectImpersonationTarget', () => {
  it('gathers the user, parameters and buckets from the lines of one session', () => {
    const target = collectImpersonationTarget(checkpointComplete, [streamStarted, newCheckpoint, checkpointComplete]);

    expect(target).toEqual({
      subject: 'fsf',
      clientId: CLIENT_ID,
      clientParams: { list_name: 'renew' },
      buckets: ['8#migrated_to_streams|0[]', '8#lists_by_name_subscription|0["renew"]']
    });
  });

  it('leaves out lines from another session or another user', () => {
    const otherSession = entry({ rid: 'h/other', message: 'Sync stream started', client_params: { list_name: 'x' } });
    const otherUser = entry({ user_id: 'someone-else', message: 'Sync stream started', client_params: { a: 1 } });

    const target = collectImpersonationTarget(checkpointComplete, [otherSession, otherUser, checkpointComplete]);

    expect(target?.clientParams).toBeUndefined();
  });

  it('needs a user to sync as', () => {
    const withoutUser = entry({ user_id: undefined, message: 'Sync stream started' });

    expect(collectImpersonationTarget(withoutUser, [withoutUser])).toBeNull();
  });

  it('falls back to the clicked line when its session is not loaded', () => {
    const target = collectImpersonationTarget(streamStarted, []);

    expect(target?.clientParams).toEqual({ list_name: 'renew' });
    expect(target?.buckets).toBeUndefined();
  });

  it('ignores an empty parameter object, which says nothing about what was sent', () => {
    const withoutParams = entry({ message: 'Sync stream started', client_params: {} });

    expect(collectImpersonationTarget(withoutParams, [withoutParams])?.clientParams).toBeUndefined();
  });

  it('matches by client id when the lines carry no request id', () => {
    const started = entry({ rid: undefined, message: 'Sync stream started', client_params: { list_name: 'renew' } });
    const complete = entry({ rid: undefined, message: 'checkpoint_complete: 1' });

    expect(collectImpersonationTarget(complete, [started, complete])?.clientParams).toEqual({ list_name: 'renew' });
  });
});

describe('recoverConnectionParams', () => {
  it('reads a connection parameter back out of the bucket it produced', () => {
    expect(recoverConnectionParams(['8#lists_by_name_connection|0["renew"]'], streams)).toEqual({
      list_name: 'renew'
    });
  });

  it('claims nothing for a stream that reads no connection parameter', () => {
    expect(recoverConnectionParams(['8#migrated_to_streams|0[]'], streams)).toEqual({});
    expect(recoverConnectionParams(['by_user["u1"]'], streams)).toEqual({});
  });
});

describe('recoverSubscriptions', () => {
  it('subscribes to the streams that do not sync by default, with the values from their buckets', () => {
    const buckets = ['8#migrated_to_streams|0[]', '8#lists_by_name_subscription|0["renew"]'];

    expect(recoverSubscriptions(buckets, streams)).toEqual([
      { name: 'lists_by_name_subscription', params: { list_name: 'renew' } }
    ]);
  });

  it('keeps each set of parameters the stream was synced with', () => {
    const buckets = ['lists_by_name_subscription|0["a"]', 'lists_by_name_subscription|0["b"]'];

    expect(recoverSubscriptions(buckets, streams)).toEqual([
      { name: 'lists_by_name_subscription', params: { list_name: 'a' } },
      { name: 'lists_by_name_subscription', params: { list_name: 'b' } }
    ]);
  });

  it('subscribes without parameters when the bucket cannot say what they were', () => {
    const twoParameters: SyncConfigStream[] = [
      {
        name: 'pairs',
        isAutoSubscribed: false,
        subscriptionParameterKeys: ['left', 'right'],
        connectionParameterKeys: []
      }
    ];

    expect(recoverSubscriptions(['pairs|0["a","b"]'], twoParameters)).toEqual([{ name: 'pairs', params: undefined }]);
  });

  it('has nothing for a stream the sync config does not declare', () => {
    expect(recoverSubscriptions(['gone|0[]'], streams)).toEqual([]);
  });
});
