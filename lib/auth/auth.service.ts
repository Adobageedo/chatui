import { createClient } from "@/lib/supabase/client";
import { ENV } from '@/config';
import type { 
  LoginCredentials, 
  SignupCredentials, 
  AuthResult, 
  AuthUser,
  AuthSession 
} from "./auth.types";

/**
 * Auth Service
 * Handles all authentication operations using Supabase Auth
 */
class AuthService {
  private static instance: AuthService | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Sign up a new user
   */
  async signup(credentials: SignupCredentials): Promise<AuthResult<AuthUser>> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            full_name: credentials.fullName,
            onboarding_completed: false,
          },
          emailRedirectTo: `${ENV.site.url}/auth/callback`,
        },
      });

      if (error) {
        return { 
          success: false, 
          error: { message: error.message, code: error.status?.toString() } 
        };
      }

      if (!data.user) {
        return { 
          success: false, 
          error: { message: "Signup failed: No user returned" } 
        };
      }

      return { success: true, data: data.user as AuthUser };
    } catch (error) {
      return {
        success: false,
        error: { 
          message: error instanceof Error ? error.message : "Unknown signup error" 
        },
      };
    }
  }

  /**
   * Sign in with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResult<AuthSession>> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return { 
          success: false, 
          error: { message: error.message, code: error.status?.toString() } 
        };
      }

      if (!data.session) {
        return { 
          success: false, 
          error: { message: "Login failed: No session created" } 
        };
      }

      return { success: true, data: data.session as AuthSession };
    } catch (error) {
      return {
        success: false,
        error: { 
          message: error instanceof Error ? error.message : "Unknown login error" 
        },
      };
    }
  }

  /**
   * Sign out the current user
   */
  async logout(): Promise<AuthResult> {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { 
          success: false, 
          error: { message: error.message } 
        };
      }

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: { 
          message: error instanceof Error ? error.message : "Unknown logout error" 
        },
      };
    }
  }

  /**
   * Get the current user
   */
  async getUser(): Promise<AuthResult<AuthUser | null>> {
    try {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        return { 
          success: false, 
          error: { message: error.message } 
        };
      }

      return { success: true, data: user as AuthUser | null };
    } catch (error) {
      return {
        success: false,
        error: { 
          message: error instanceof Error ? error.message : "Unknown error" 
        },
      };
    }
  }

  /**
   * Get the current session
   */
  async getSession(): Promise<AuthResult<AuthSession | null>> {
    try {
      const supabase = createClient();
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        return { 
          success: false, 
          error: { message: error.message } 
        };
      }

      return { success: true, data: session as AuthSession | null };
    } catch (error) {
      return {
        success: false,
        error: { 
          message: error instanceof Error ? error.message : "Unknown error" 
        },
      };
    }
  }

  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<AuthResult<AuthSession>> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        return { 
          success: false, 
          error: { message: error.message } 
        };
      }

      if (!data.session) {
        return { 
          success: false, 
          error: { message: "Failed to refresh session" } 
        };
      }

      return { success: true, data: data.session as AuthSession };
    } catch (error) {
      return {
        success: false,
        error: { 
          message: error instanceof Error ? error.message : "Unknown error" 
        },
      };
    }
  }

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<AuthResult> {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${ENV.site.url}/auth/reset-password`,
      });

      if (error) {
        return { 
          success: false, 
          error: { message: error.message } 
        };
      }

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: { 
          message: error instanceof Error ? error.message : "Unknown error" 
        },
      };
    }
  }

  /**
   * Update user password
   */
  async updatePassword(newPassword: string): Promise<AuthResult> {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { 
          success: false, 
          error: { message: error.message } 
        };
      }

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: { 
          message: error instanceof Error ? error.message : "Unknown error" 
        },
      };
    }
  }

  /**
   * Mark onboarding as completed
   */
  async completeOnboarding(): Promise<AuthResult> {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { onboarding_completed: true },
      });

      if (error) {
        return { 
          success: false, 
          error: { message: error.message } 
        };
      }

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: { 
          message: error instanceof Error ? error.message : "Unknown error" 
        },
      };
    }
  }
}

export const authService = AuthService.getInstance();
