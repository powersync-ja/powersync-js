import { v } from 'convex/values';
import { DatabaseReader, mutation } from './_generated/server';
import { assertListOwner, assertOwnerIdMatches, mutationError, requireOwnerId } from './authorization';
import { MUTATION_ERROR_CODES } from './mutationErrors';
import schema from './schema';

/**
 * PowerSync requires an ID mapping from local-first UUIDs to Convex IDs
 * which are generated on the backend server.
 * The client side will reference records with the `uuid` field.
 * This helper helps mutations to find the corresponding record.
 */
export const findListByUuid = async (params: { db: DatabaseReader; uuid: string }) => {
  const { db, uuid } = params;
  return db
    .query('lists')
    .withIndex('by_uuid', (q) => q.eq('uuid', uuid))
    .first();
};

/**
 * Create a new list record given its data.
 */
export const create = mutation({
  args: schema.tables.lists.validator,
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    assertOwnerIdMatches(args.owner_id, ownerId);
    await ctx.db.insert('lists', args);
  }
});

/**
 * Update a list given a partial list record data.
 */
export const update = mutation({
  // The uuid is required, every other field is an optional patch
  args: v.object({ uuid: v.string() }).extend(schema.tables.lists.validator.partial().fields),
  handler: async (ctx, { uuid, ...fields }) => {
    const { db } = ctx;
    const ownerId = await requireOwnerId(ctx);
    const matching = await findListByUuid({ db, uuid });
    if (!matching) {
      throw mutationError(MUTATION_ERROR_CODES.NOT_FOUND, `No matching list found for uuid=${uuid}`);
    }
    assertListOwner(matching, ownerId);
    if (fields.owner_id !== undefined) {
      assertOwnerIdMatches(fields.owner_id, ownerId);
    }
    await db.patch(matching._id, fields);
  }
});

/**
 * Remove a list given its local-first uuid id.
 */
export const remove = mutation({
  args: {
    uuid: v.string()
  },
  handler: async (ctx, { uuid }) => {
    const { db } = ctx;
    const ownerId = await requireOwnerId(ctx);
    const matching = await findListByUuid({ db, uuid });
    if (!matching) {
      throw mutationError(MUTATION_ERROR_CODES.NOT_FOUND, `No matching list found for uuid=${uuid}`);
    }
    assertListOwner(matching, ownerId);
    await db.delete(matching._id);
  }
});
