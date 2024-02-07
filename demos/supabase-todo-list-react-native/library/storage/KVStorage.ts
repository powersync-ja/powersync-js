import { deleteItemAsync, getItemAsync, setItemAsync } from 'expo-secure-store';

export class KVStorage {
  async getItem(key: string): Promise<string | null> {
    try {
      const session = await getItemAsync(key);
      return session ?? null;
    } catch (error) {
      // There was an error on the native side
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    await setItemAsync(key, value);
  }

  async removeItem(key: string): Promise<void> {
    await deleteItemAsync(key);
  }
}
