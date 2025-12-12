import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { config } from './config';
import { Database } from './database.types';

const authStorage = {
  setItem: async (key: string, value: string) => await AsyncStorage.setItem(key, value),
  getItem: async (key: string) => await AsyncStorage.getItem(key),
  removeItem: async (key: string) => await AsyncStorage.removeItem(key)
};

export const supabase = createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
  auth: {
    storage: authStorage
  }
});
