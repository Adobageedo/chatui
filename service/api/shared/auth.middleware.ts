import { createClient } from "@/lib/supabase/server";
import { UnauthorizedError } from "./api-error";

export interface AuthContext {
  userId: string;
  user: {
    id: string;
    email?: string;
  };
}

/**
 * Authentication middleware utilities
 */
export class AuthMiddleware {
  /**
   * Verify user authentication and return user context
   */
  static async verifyAuth(): Promise<AuthContext> {
    const supabase = await createClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      throw new UnauthorizedError("Authentication required");
    }

    return {
      userId: user.id,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  /**
   * Optional auth - returns null if not authenticated
   */
  static async getAuthOrNull(): Promise<AuthContext | null> {
    try {
      return await this.verifyAuth();
    } catch {
      return null;
    }
  }
}
