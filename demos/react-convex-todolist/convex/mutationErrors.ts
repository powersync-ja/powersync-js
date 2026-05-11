export const MUTATION_ERROR_CODES = {
  // We should never reach this on the client side.
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  NOT_AUTHORIZED: 'NOT_AUTHORIZED',
  NOT_FOUND: 'NOT_FOUND'
} as const;

export type MutationErrorCode = (typeof MUTATION_ERROR_CODES)[keyof typeof MUTATION_ERROR_CODES];

export type ConvexMutationErrorData = {
  code?: MutationErrorCode;
  message?: string;
};

export const UPLOAD_REJECTION_MUTATION_ERROR_CODES = new Set<string>([
  MUTATION_ERROR_CODES.NOT_AUTHORIZED,
  MUTATION_ERROR_CODES.NOT_FOUND
]);
