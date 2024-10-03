import * as ExpoStorage from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class ExpoKVStorage {
  async getItem(key: string): Promise<string | null> {
    try {
      const session = await ExpoStorage.getItemAsync(key);
      return session ?? null;
    } catch (error) {
      // There was an error on the native side
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    await ExpoStorage.setItemAsync(key, value);
  }

  async removeItem(key: string): Promise<void> {
    await ExpoStorage.deleteItemAsync(key);
  }
}

class WebKVStorage {
  async getItem(key: string): Promise<string | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ?? null;
    } catch (error) {
      // There was an error
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }
}

const isWeb = Platform.OS === 'web';
export const KVStorage = isWeb ? WebKVStorage : ExpoKVStorage;
