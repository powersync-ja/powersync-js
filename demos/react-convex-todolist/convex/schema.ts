import { authTables } from '@convex-dev/auth/server';
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  ...authTables,
  lists: defineTable({
    created_at: v.optional(v.string()),
    name: v.string(),
    owner_id: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    attributes: v.optional(v.record(v.string(), v.string())),
    settings: v.optional(
      v.object({
        theme: v.string(),
        color: v.string(),
        is_public: v.boolean()
      })
    ),

    /**
     * Due to ID mapping, we cant require a strict Convex `id` ID field - which
     * correlates to a matching todo record here.
     * This value will be the local-first UUID.
     */
    uuid: v.string()
  }).index('by_uuid', ['uuid']),

  todos: defineTable({
    /**
     * Due to ID mapping, we cant require a strict Convex `id` ID field - which
     * correlates to a matching todo record here.
     * This value will be the local-first UUID.
     */
    uuid: v.string(),
    created_at: v.optional(v.string()),
    completed_at: v.optional(v.union(v.null(), v.string())),
    description: v.string(),
    list_id: v.id('lists'),
    /**
     * Local-first version of list_id
     */
    list_uuid: v.string()
  })
    .index('by_uuid', ['uuid'])
    .index('by_list_id', ['list_id']),

  powersync_checkpoints: defineTable({
    last_updated: v.float64()
  })
});
