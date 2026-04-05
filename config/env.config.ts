/**
 * Environment Variables Configuration
 * Centralized access to environment variables with validation
 */

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue!;
};

export const ENV = {
  // Supabase
  supabase: {
    url: getEnvVar("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    serviceRoleKey: getEnvVar("SUPABASE_SERVICE_ROLE_KEY", ""),
  },

  // Site
  site: {
    url: getEnvVar("NEXT_PUBLIC_SITE_URL"),
  },

  // OpenAI
  openai: {
    apiKey: getEnvVar("OPENAI_API_KEY", ""),
  },

  // Node Environment
  nodeEnv: process.env.NODE_ENV || "development",
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
} as const;

export default ENV;
