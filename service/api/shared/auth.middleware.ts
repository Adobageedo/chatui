import { createClient } from "@/lib/supabase/server";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { UnauthorizedError } from "./api-error";
import { headers } from "next/headers";

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
   * Tries cookies first, then falls back to Authorization header (for Outlook embedded browser)
   */
  static async verifyAuth(): Promise<AuthContext> {
    // First try cookie-based auth (normal browser flow)
    const supabase = await createClient();
    let {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // If cookie auth fails, try Authorization header (Outlook embedded browser)
    if (error || !user) {
      const headersList = await headers();
      const authHeader = headersList.get("authorization");

      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        // Use the browser client to verify the token since we don't have cookies
        const browserSupabase = createBrowserClient();
        const { data: { user: tokenUser }, error: tokenError } = await browserSupabase.auth.getUser(token);

        if (!tokenError && tokenUser) {
          user = tokenUser;
        }
      }
    }

    if (!user) {
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
