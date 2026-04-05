import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Singleton Supabase Admin Client
 * Uses service role key to bypass RLS policies
 * Use for server-side operations that need elevated permissions
 */
class SupabaseAdminClient {
  private static instance: SupabaseClient | null = null;

  private constructor() {}

  static getInstance(): SupabaseClient {
    if (!SupabaseAdminClient.instance) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Missing Supabase environment variables");
      }

      SupabaseAdminClient.instance = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }

    return SupabaseAdminClient.instance;
  }
}

export const getSupabaseAdmin = () => SupabaseAdminClient.getInstance();
