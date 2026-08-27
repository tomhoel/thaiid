import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { reportError } from '../utils/reportError';

const ONBOARDING_KEY = 'onboarding_completed_v1';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  ready: boolean;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  ready: false,
  isAuthenticated: false,
  isOnboarded: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  completeOnboarding: async () => {},
  resetOnboarding: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        // 1. Check onboarding state from local storage
        const storedOnboarded = await AsyncStorage.getItem(ONBOARDING_KEY);

        // 2. Get initial session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          reportError('AuthContext.getSession', error);
        }

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setIsOnboarded(!!session?.user || storedOnboarded === 'true');
        }
      } catch (e) {
        reportError('AuthContext.initAuth', e);
      } finally {
        if (mounted) {
          setLoading(false);
          setReady(true);
        }
      }
    }

    initAuth();

    // 3. Listen for auth state changes (OAuth redirect, sign-in, token refresh, sign-out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsOnboarded(true);
        await AsyncStorage.setItem(ONBOARDING_KEY, 'true').catch(() => {});
      }
      setLoading(false);
      setReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const redirectTo =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? window.location.origin
          : Linking.createURL('/');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        throw error;
      }

      // On native mobile platforms with in-app browser linking
      if (data?.url && Platform.OS !== 'web') {
        await Linking.openURL(data.url);
      }
    } catch (e: any) {
      reportError('AuthContext.signInWithGoogle', e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      setIsOnboarded(true);
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (e) {
      reportError('AuthContext.completeOnboarding', e);
    }
  };

  const resetOnboarding = async () => {
    try {
      setIsOnboarded(false);
      await AsyncStorage.removeItem(ONBOARDING_KEY);
    } catch (e) {
      reportError('AuthContext.resetOnboarding', e);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      setUser(null);
      setSession(null);
      await resetOnboarding();
    } catch (e: any) {
      reportError('AuthContext.signOut', e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        ready,
        isAuthenticated: !!user,
        isOnboarded,
        signInWithGoogle,
        signOut,
        completeOnboarding,
        resetOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
