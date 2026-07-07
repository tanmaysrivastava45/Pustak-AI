import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isConfigured } from '../lib/supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If not configured, check if we have a demo user stored in localStorage
    if (!isConfigured) {
      const storedDemo = localStorage.getItem('pustak_demo_user');
      if (storedDemo) {
        try {
          const parsed = JSON.parse(storedDemo);
          setUser(parsed);
          setSession({ access_token: 'mock-valid-token', user: parsed });
        } catch {
          // ignore
        }
      }
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
    });

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async ({ email, password }) => {
    if (!isConfigured) {
      // Demo authentication mode
      const demoUser = {
        id: '00000000-0000-0000-0000-000000000001',
        email,
        user_metadata: { full_name: email.split('@')[0] },
      };
      localStorage.setItem('pustak_demo_user', JSON.stringify(demoUser));
      setUser(demoUser);
      setSession({ access_token: 'mock-valid-token', user: demoUser });
      return { user: demoUser, error: null };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signUp = async ({ email, password, fullName }) => {
    if (!isConfigured) {
      const demoUser = {
        id: '00000000-0000-0000-0000-000000000001',
        email,
        user_metadata: { full_name: fullName || email.split('@')[0] },
      };
      localStorage.setItem('pustak_demo_user', JSON.stringify(demoUser));
      setUser(demoUser);
      setSession({ access_token: 'mock-valid-token', user: demoUser });
      return { user: demoUser, error: null };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    if (!isConfigured) {
      localStorage.removeItem('pustak_demo_user');
      setUser(null);
      setSession(null);
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email) => {
    if (!isConfigured) {
      return { message: 'Demo mode: Password reset email simulated' };
    }
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        isDemoMode: !isConfigured,
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
