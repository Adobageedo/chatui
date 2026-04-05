/**
 * Environment Variables Configuration
 * Centralized access to environment variables with validation
 * 
 * IMPORTANT: Next.js inlines NEXT_PUBLIC_* variables at BUILD TIME
 * Must access them directly, not via dynamic keys
 */

// Helper for server-only variables
const getServerEnvVar = (value: string | undefined, key: string, defaultValue?: string): string => {
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue!;
};

export const ENV = {
  // Supabase - NEXT_PUBLIC_* variables work in browser and server
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    // Server-only
    serviceRoleKey: typeof window === 'undefined' 
      ? getServerEnvVar(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY", "")
      : "",
  },

  // Site
  site: {
    url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  },

  // OpenAI - Server-only
  openai: {
    apiKey: typeof window === 'undefined'
      ? getServerEnvVar(process.env.OPENAI_API_KEY, "OPENAI_API_KEY", "")
      : "",
  },

  // Node Environment
  nodeEnv: process.env.NODE_ENV || "development",
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
} as const;

export default ENV;
