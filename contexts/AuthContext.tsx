"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AuthState, AuthUser, AuthSession } from "@/lib/auth/auth.types";
import { sessionService } from "@/lib/auth/session.service";
import { useRouter } from "next/navigation";

interface AuthContextValue extends AuthState {
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const refreshAuth = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    setState({
      user: session?.user as AuthUser | null,
      session: session as AuthSession | null,
      isLoading: false,
      isAuthenticated: !!session,
    });
  };

  const handleSessionTimeout = () => {
    setState((prev: AuthState) => ({
      ...prev,
      user: null,
      session: null,
      isAuthenticated: false,
    }));
    
    const supabase = createClient();
    supabase.auth.signOut();
    router.push("/login?timeout=true");
  };

  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: any) => {
        setState({
          user: session?.user as AuthUser | null,
          session: session as AuthSession | null,
          isLoading: false,
          isAuthenticated: !!session,
        });

        if (session) {
          sessionService.startMonitoring(handleSessionTimeout);
        } else {
          sessionService.stopMonitoring();
        }
      }
    );

    refreshAuth();

    return () => {
      subscription.unsubscribe();
      sessionService.stopMonitoring();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
