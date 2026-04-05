import type { User, Session } from "@supabase/supabase-js";

export interface AuthUser extends Omit<User, 'created_at'> {
  onboarding_completed?: boolean;
  created_at: string;
}

export interface AuthSession extends Session {}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignupCredentials {
  email: string;
  password: string;
  fullName?: string;
}

export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface AuthError {
  message: string;
  code?: string;
}

export type AuthResult<T = void> = 
  | { success: true; data: T }
  | { success: false; error: AuthError };
