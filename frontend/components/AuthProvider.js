'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import LoginScreen from './LoginScreen';
import { Skeleton } from '@/components/ui/skeleton';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

const supabase = createClient();

// Session state: undefined = still loading, null = signed out, object = signed in.
// Children (the app) render only when signed in, so the school data load
// happens after authentication.
export default function AuthProvider({ children }){
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    // The role comes from the JWT's app_metadata (set per user in the Supabase
    // dashboard); Admin is the default for users without an explicit role.
    role: session?.user?.app_metadata?.role || 'Admin',
    signOut: () => supabase.auth.signOut(),
  }), [session]);

  return <Ctx.Provider value={value}>
    {session === undefined
      ? <div className="min-h-screen grid place-items-center bg-background"><Skeleton className="size-10 rounded-lg"/></div>
      : session ? children : <LoginScreen/>}
  </Ctx.Provider>;
}
