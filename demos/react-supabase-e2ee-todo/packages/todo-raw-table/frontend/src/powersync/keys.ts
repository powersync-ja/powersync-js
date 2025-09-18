import { usePowerSync, useQuery } from '@powersync/react';
import type { AbstractPowerSyncDatabase } from '@powersync/web';
import { makeKeyId } from '../utils/keyring';

export function useWrappedKey(userId: string | null | undefined, provider: 'password' | 'webauthn') {
  const db = usePowerSync();
  const id = userId ? makeKeyId(userId, provider) : '';
  // Return the row reactively; caller can pick first element
  return useQuery('SELECT * FROM e2ee_keys WHERE id = ? LIMIT 1', [id]);
}

export function getDB(): AbstractPowerSyncDatabase {
  return usePowerSync();
}
