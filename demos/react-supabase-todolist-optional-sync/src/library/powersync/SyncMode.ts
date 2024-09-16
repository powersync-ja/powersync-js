const SYNC_KEY = 'syncEnabled';

export function getSyncEnabled(dbName: string) {
  const key = `${SYNC_KEY}-${dbName}`;
  const value = localStorage.getItem(key);

  if (!value) {
    setSyncEnabled(key, false);
    return false;
  }

  return value === 'TRUE';
}

export function setSyncEnabled(dbName: string, enabled: boolean) {
  const key = `${SYNC_KEY}-${dbName}`;
  const enabledString = enabled ? 'TRUE' : 'FALSE';
  localStorage.setItem(key, enabledString);
}
