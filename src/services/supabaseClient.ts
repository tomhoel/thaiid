import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = Constants.expoConfig?.extra ?? {};
const supabaseUrl = (extra.supabaseUrl as string) || 'https://iufuxlkskczdhlptszdf.supabase.co';
const supabaseAnonKey =
  (extra.supabaseAnonKey as string) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1ZnV4bGtzY2N6ZGhscHRzemRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzMTcyMjMsImV4cCI6MjA1Nzg5MzIyM30.6tUjVb-b-722s4C_Z3aF-h8jR_6y4fU4b2g9p_yX1_A';

const isWeb = Platform.OS === 'web';
const isBrowser = typeof window !== 'undefined';

// Universal SSR-safe storage adapter
const universalStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (isWeb) {
      if (!isBrowser) return null;
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (isWeb) {
      if (!isBrowser) return;
      try {
        window.localStorage.setItem(key, value);
      } catch {}
      return;
    }
    try {
      await AsyncStorage.setItem(key, value);
    } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    if (isWeb) {
      if (!isBrowser) return;
      try {
        window.localStorage.removeItem(key);
      } catch {}
      return;
    }
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: universalStorage,
    autoRefreshToken: isBrowser || !isWeb,
    persistSession: isBrowser || !isWeb,
    detectSessionInUrl: isBrowser,
  },
});
