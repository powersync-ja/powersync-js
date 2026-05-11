import { v } from 'convex/values';
import { DatabaseReader, mutation } from './_generated/server';
import { assertListOwner, mutationError, requireOwnerId } from './authorization';
import { findListByUuid } from './lists';
import { MUTATION_ERROR_CODES } from './mutationErrors';
import schema from './schema';

/**
 * PowerSync requires an ID mapping from local-first UUIDs to Convex IDs
 * which are generated on the backend server.
 * The client side will reference records with the `uuid` field.
 * This helper helps mutations to find the corresponding record.
 */
const findTodoByUuid = async (params: { db: DatabaseReader; uuid: string }) => {
  const { db, uuid } = params;
  return db
    .query('todos')
    .withIndex('by_uuid', (q) => q.eq('uuid', uuid))
    .first();
};

/**
 * Create a todo record given its record data.
 * The `list_id` is resolved here on the backend.
 */
export const create = mutation({
  // This does not include an `id` field. The local uuid is presented in the `uuid` field
  args: schema.tables.todos.validator.omit('list_id'),
  handler: async (ctx, args) => {
    const { db } = ctx;
    const ownerId = await requireOwnerId(ctx);
    const { list_uuid } = args;
    //need to set the corresponding list_id for the provided list_uuid
    const matchingList = await findListByUuid({ db, uuid: list_uuid });
    if (!matchingList) {
      throw mutationError(MUTATION_ERROR_CODES.NOT_FOUND, `No matching list found for uuid=${list_uuid}`);
    }
    assertListOwner(matchingList, ownerId);
    return await db.insert('todos', {
      ...args,
      list_id: matchingList._id
    });
  }
});

/**
 * Update a todo record given a partial update.
 */
export const update = mutation({
  // The uuid is required, every other field is an optional patch
  args: v.object({ uuid: v.string() }).extend(schema.tables.todos.validator.partial().fields),
  handler: async (ctx, { uuid, ...fields }) => {
    const { db } = ctx;
    const ownerId = await requireOwnerId(ctx);
    let matching = await findTodoByUuid({ db, uuid });
    if (!matching) {
      throw mutationError(MUTATION_ERROR_CODES.NOT_FOUND, `No matching todo found for uuid=${uuid}`);
    }
    const currentList = await db.get(matching.list_id);
    if (!currentList) {
      throw mutationError(MUTATION_ERROR_CODES.NOT_FOUND, `No matching list found for todo uuid=${uuid}`);
    }
    assertListOwner(currentList, ownerId);

    if (fields.list_uuid !== undefined) {
      const nextList = await findListByUuid({ db, uuid: fields.list_uuid });
      if (!nextList) {
        throw mutationError(MUTATION_ERROR_CODES.NOT_FOUND, `No matching list found for uuid=${fields.list_uuid}`);
      }
      assertListOwner(nextList, ownerId);
      fields.list_id = nextList._id;
    }

    await db.patch(matching._id, fields);
  }
});

/**
 * Remove a todo record given it's local-first uuid id.
 */
export const remove = mutation({
  args: {
    uuid: v.string()
  },
  handler: async (ctx, { uuid }) => {
    const { db } = ctx;
    const ownerId = await requireOwnerId(ctx);
    let matching = await findTodoByUuid({ db, uuid });
    if (!matching) {
      throw mutationError(MUTATION_ERROR_CODES.NOT_FOUND, `No matching todo found for uuid=${uuid}`);
    }
    const list = await db.get(matching.list_id);
    if (!list) {
      throw mutationError(MUTATION_ERROR_CODES.NOT_FOUND, `No matching list found for todo uuid=${uuid}`);
    }
    assertListOwner(list, ownerId);
    await db.delete(matching._id);
  }
});

export const createBatch = mutation({
  args: {
    todos: v.array(schema.tables.todos.validator)
  },
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    const ids = [];
    for (const todo of args.todos) {
      const list = await ctx.db.get(todo.list_id);
      if (!list) {
        throw mutationError(MUTATION_ERROR_CODES.NOT_FOUND, `No matching list found for id=${todo.list_id}`);
      }
      assertListOwner(list, ownerId);
      const id = await ctx.db.insert('todos', todo);
      ids.push(id);
    }
    return ids;
  }
});
