import EncryptedStorage from 'react-native-encrypted-storage';

export const Storage = {
  getItem: async (key: string) => {
    try {
      const session = await EncryptedStorage.getItem(key);

      return session ?? null;
    } catch (error) {
      // There was an error on the native side
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    await EncryptedStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    try {
      await EncryptedStorage.removeItem(key);
    } catch (ex) {}
  }
};
