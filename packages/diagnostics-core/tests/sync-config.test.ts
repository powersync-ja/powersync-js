import { describe, expect, it } from 'vitest';

import {
  areParameterObjectsEqual,
  coerceParameterValue,
  readSyncConfigParameters,
  selectSubscribableStreams
} from '../src/sync-config';

describe('readSyncConfigParameters', () => {
  it('lists each stream with the subscription parameters its queries read', () => {
    const config = {
      config: { edition: 3 },
      streams: {
        list_todos: {
          query: "SELECT * FROM todos WHERE list_id = subscription.parameter('list_id')"
        },
        project_tasks: {
          auto_subscribe: true,
          with: { visible: "SELECT id FROM projects WHERE org = subscription.parameters() ->> 'org_id'" },
          query: ['SELECT * FROM tasks WHERE project_id IN visible', "AND owner = subscription.parameter('owner')"]
        },
        settings: { query: 'SELECT * FROM settings' }
      }
    };

    expect(readSyncConfigParameters(config).streams).toEqual([
      {
        name: 'list_todos',
        isAutoSubscribed: false,
        subscriptionParameterKeys: ['list_id'],
        connectionParameterKeys: []
      },
      {
        name: 'project_tasks',
        isAutoSubscribed: true,
        subscriptionParameterKeys: ['owner', 'org_id'],
        connectionParameterKeys: []
      },
      { name: 'settings', isAutoSubscribed: false, subscriptionParameterKeys: [], connectionParameterKeys: [] }
    ]);
  });

  it('collects connection parameters once across streams', () => {
    const config = {
      streams: {
        a: { query: "SELECT * FROM a WHERE env = connection.parameter('environment')" },
        b: {
          query:
            "SELECT * FROM b WHERE env = connection.parameters() ->> 'environment' AND v = connection.parameter('version')"
        }
      }
    };

    expect(readSyncConfigParameters(config).connectionParameterKeys).toEqual(['environment', 'version']);
  });

  it('reads legacy sync rules client parameters from parameter queries, in both spellings', () => {
    const config = {
      bucket_definitions: {
        posts: {
          parameters: "SELECT (request.parameters() ->> 'current_page') AS page",
          data: ['SELECT * FROM posts WHERE page = bucket.page']
        },
        stores: {
          // request.user_id() is a token claim, not a client parameter.
          parameters: ['SELECT request.user_id() AS user_id', 'SELECT user_parameters.tenant AS tenant'],
          data: ['SELECT * FROM stores WHERE tenant = bucket.tenant']
        }
      }
    };

    expect(readSyncConfigParameters(config)).toEqual({
      hasConfig: true,
      streams: [],
      connectionParameterKeys: ['current_page', 'tenant']
    });
  });

  it('returns nothing for a config it cannot read', () => {
    const nothing = { hasConfig: false, streams: [], connectionParameterKeys: [] };
    expect(readSyncConfigParameters(null)).toEqual(nothing);
    expect(readSyncConfigParameters('streams: oops')).toEqual(nothing);
    expect(readSyncConfigParameters({ streams: 'oops' })).toEqual(nothing);
    expect(readSyncConfigParameters({ streams: { todos: { query: 42 } } })).toEqual(nothing);
    expect(readSyncConfigParameters({ streams: { todos: { auto_subscribe: 'yes' } } })).toEqual(nothing);
  });

  it('ignores keys it does not read', () => {
    const config = { streams: { todos: { query: 'SELECT * FROM todos', priority: 1, unknown: { nested: true } } } };

    expect(readSyncConfigParameters(config).hasConfig).toBe(true);
  });
});

/** A deployed edition 3 config as the dashboard receives it parsed, using both the `queries` list and the single `query` form. */
const DEPLOYED_CONFIG = {
  config: { edition: 3 },
  streams: {
    migrated_to_streams: {
      auto_subscribe: true,
      queries: ['SELECT * FROM counters', 'SELECT * FROM customers']
    },
    // Connection parameter: set once at connect time, applies for the whole session
    lists_by_name_connection: {
      auto_subscribe: true,
      query: "SELECT * FROM lists WHERE name = connection.parameter('list_name')"
    },
    // Subscription parameter: passed per-subscribe, can vary at runtime
    lists_by_name_subscription: {
      query: "SELECT * FROM lists WHERE name = subscription.parameter('list_name')"
    }
  }
};

describe('readSyncConfigParameters on a deployed edition 3 config', () => {
  const result = readSyncConfigParameters(DEPLOYED_CONFIG);

  it('lists every stream, in config order, with its auto_subscribe flag', () => {
    expect(result.streams.map(({ name, isAutoSubscribed }) => [name, isAutoSubscribed])).toEqual([
      ['migrated_to_streams', true],
      ['lists_by_name_connection', true],
      ['lists_by_name_subscription', false]
    ]);
  });

  it('finds the subscription parameter on the stream that reads it, and nowhere else', () => {
    const byName = new Map(result.streams.map((stream) => [stream.name, stream.subscriptionParameterKeys]));
    expect(byName.get('lists_by_name_subscription')).toEqual(['list_name']);
    expect(byName.get('lists_by_name_connection')).toEqual([]);
    expect(byName.get('migrated_to_streams')).toEqual([]);
  });

  it('finds the connection parameter across the whole config', () => {
    expect(result.connectionParameterKeys).toEqual(['list_name']);
  });
});

describe('coerceParameterValue', () => {
  it('sends JSON-looking input typed and everything else as text', () => {
    expect(coerceParameterValue('42')).toBe(42);
    expect(coerceParameterValue('true')).toBe(true);
    expect(coerceParameterValue('{"a":1}')).toEqual({ a: 1 });
    expect(coerceParameterValue('"42"')).toBe('42');
    expect(coerceParameterValue('eu-west')).toBe('eu-west');
  });
});

describe('areParameterObjectsEqual', () => {
  it('ignores key order', () => {
    expect(areParameterObjectsEqual({ org: 'a', team: 'b' }, { team: 'b', org: 'a' })).toBe(true);
  });

  it('treats no parameters and an empty object as the same request', () => {
    expect(areParameterObjectsEqual(undefined, undefined)).toBe(true);
    expect(areParameterObjectsEqual(undefined, {})).toBe(true);
  });

  it('separates different values, added keys and different types', () => {
    expect(areParameterObjectsEqual({ org: 'a' }, { org: 'b' })).toBe(false);
    expect(areParameterObjectsEqual({ org: 'a' }, { org: 'a', team: 'b' })).toBe(false);
    expect(areParameterObjectsEqual({ org: '1' }, { org: 1 })).toBe(false);
  });
});

describe('selectSubscribableStreams', () => {
  it('offers streams that need an explicit subscription, and skips the ones that do not', () => {
    const streams = [
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

    expect(selectSubscribableStreams(streams).map((stream) => stream.name)).toEqual(['lists_by_name_subscription']);
  });

  it('keeps an auto-subscribed stream that reads subscription parameters', () => {
    const streams = [
      { name: 'todos', isAutoSubscribed: true, subscriptionParameterKeys: ['list_id'], connectionParameterKeys: [] }
    ];

    expect(selectSubscribableStreams(streams).map((stream) => stream.name)).toEqual(['todos']);
  });
});
