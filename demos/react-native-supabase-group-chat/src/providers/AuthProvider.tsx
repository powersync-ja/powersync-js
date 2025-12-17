import { createContext, type ReactNode, useContext, useState, useEffect } from 'react';
import { supabase } from '@/library/supabase';
import { AuthUser, AuthSession } from '@supabase/supabase-js';
import { Loading } from '@/components/loading/Loading';

export type AuthState = {
  session: AuthSession | null;
  user: AuthUser | null;
  signIn: ({ session, user }: { session: AuthSession | null; user: AuthUser | null }) => void;
  signOut: () => void;
  isSyncEnabled: boolean;
  setIsSyncEnabled: (isSyncEnabled: boolean) => void;
};

export const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  signIn: () => {},
  signOut: () => {},
  isSyncEnabled: true,
  setIsSyncEnabled: () => {}
});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncEnabled, setIsSyncEnabled] = useState(true);

  async function signIn({ session, user }: { session: AuthSession | null; user: AuthUser | null }) {
    console.log('signIn');
    setSession(session);
    setUser(user);
  }

  async function signOut() {
    console.log('signOut');
    const { error } = await supabase.auth.signOut();

    setSession(null);
    setUser(null);

    if (error) {
      console.error(error);
    }
  }

  async function getSession() {
    const { data } = await supabase.auth.getSession();

    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);
    }

    setIsLoading(false);
  }

  useEffect(
    () => {
      if (!session) getSession();
    },
    [session]
  );

  if (isLoading) {
    return <Loading />;
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        signIn,
        signOut,
        isSyncEnabled,
        setIsSyncEnabled
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
