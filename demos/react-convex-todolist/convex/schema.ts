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

    // External stable key from PowerSync writes.
    uuid: v.string(),
    // Legacy fields kept for backwards compatibility with existing data.
    owner: v.optional(v.string()),
    archived: v.optional(v.number())
  }).index('by_uuid', ['uuid']),

  todos: defineTable({
    // Basic fields
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
    list_uuid: v.string(),

    // All Convex datatypes for stress testing
    // String types
    title: v.optional(v.string()),
    notes: v.optional(v.string()),
    category: v.optional(v.string()),

    // Number types
    priority: v.optional(v.number()),
    estimated_hours: v.optional(v.float64()),
    progress_percentage: v.optional(v.float64()),

    // Boolean types
    is_urgent: v.optional(v.boolean()),
    is_private: v.optional(v.boolean()),
    has_attachments: v.optional(v.boolean()),

    // Array types
    tags: v.optional(v.array(v.string())),
    dependencies: v.optional(v.array(v.id('todos'))),
    assigned_users: v.optional(v.array(v.string())),

    // Object types
    metadata: v.optional(v.record(v.string(), v.any())),
    custom_fields: v.optional(v.record(v.string(), v.union(v.string(), v.number(), v.boolean()))),

    // ID references
    parent_task_id: v.optional(v.id('todos')),
    project_id: v.optional(v.id('lists')),

    // Union types
    status: v.optional(
      v.union(v.literal('pending'), v.literal('in_progress'), v.literal('completed'), v.literal('cancelled'))
    ),
    difficulty: v.optional(v.union(v.literal('easy'), v.literal('medium'), v.literal('hard'))),

    // Null handling
    archived_at: v.optional(v.union(v.null(), v.string())),
    deleted_by: v.optional(v.union(v.null(), v.string())),

    // Legacy fields kept for backwards compatibility
    completed: v.optional(v.number()),
    created_by: v.optional(v.union(v.null(), v.string())),
    completed_by: v.optional(v.union(v.null(), v.string())),
    photo_id: v.optional(v.union(v.null(), v.string())),
    owner_id: v.optional(v.string())
  })
    .index('by_uuid', ['uuid'])
    .index('by_list_id', ['list_id'])
    .index('by_status', ['status'])
    .index('by_priority', ['priority'])
    .index('by_project', ['project_id']),

  powersync_checkpoints: defineTable({
    last_updated: v.float64()
  })
});
