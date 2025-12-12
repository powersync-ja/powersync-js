import { FC, ReactNode } from 'react';

/**
 * Mock GuardBySync that always renders children immediately.
 * Bypasses the sync check for testing purposes.
 */
export const GuardBySync: FC<{ children: ReactNode; priority?: number }> = ({ children }) => {
  // Always render children - skip the sync check
  return <>{children}</>;
};
