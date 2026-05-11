import { getAuthUserId } from '@convex-dev/auth/server';
import { ConvexError } from 'convex/values';
import type { Doc } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { MUTATION_ERROR_CODES, type MutationErrorCode } from './mutationErrors';

export function mutationError(code: MutationErrorCode, message: string) {
  return new ConvexError({
    code,
    message
  });
}

export async function requireOwnerId(ctx: Pick<MutationCtx, 'auth'>) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw mutationError(MUTATION_ERROR_CODES.NOT_AUTHENTICATED, 'Not authenticated');
  }

  return userId;
}

export function assertOwnerIdMatches(actualOwnerId: string, expectedOwnerId: string) {
  if (actualOwnerId !== expectedOwnerId) {
    throw mutationError(MUTATION_ERROR_CODES.NOT_AUTHORIZED, 'Not authorized');
  }
}

export function assertListOwner(list: Doc<'lists'>, ownerId: string) {
  assertOwnerIdMatches(list.owner_id, ownerId);
}
