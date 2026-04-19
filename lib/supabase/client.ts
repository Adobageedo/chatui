import { createBrowserClient } from '@supabase/ssr'
import { ENV } from '@/config';

let cachedClient: ReturnType<typeof createBrowserClient> | null = null;
let sessionFromHash: { access_token: string; refresh_token: string } | null = null;

// Check for tokens in URL hash (for Outlook embedded browser auth flow)
if (typeof window !== 'undefined') {
  const hash = window.location.hash;
  if (hash && hash.includes('access_token')) {
    try {
      const params = new URLSearchParams(hash.substring(1));
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (access_token) {
        sessionFromHash = { access_token, refresh_token: refresh_token || '' };
        console.log('[SupabaseClient] Found tokens in URL hash');
      }
    } catch (e) {
      console.error('[SupabaseClient] Error parsing hash:', e);
    }
  }
}

export function createClient() {
  // Return cached client if available (singleton pattern for session sharing)
  if (cachedClient) {
    return cachedClient;
  }

  const client = createBrowserClient(
    ENV.supabase.url,
    ENV.supabase.anonKey
  );

  // If we have tokens from hash, set the session immediately
  if (sessionFromHash) {
    client.auth.setSession(sessionFromHash).then(({ error }) => {
      if (error) {
        console.error('[SupabaseClient] Failed to set session from hash:', error);
      } else {
        console.log('[SupabaseClient] Session set from URL hash');
      }
    });
  }

  cachedClient = client;
  return client;
}

// Reset cache (useful for testing)
export function resetClient() {
  cachedClient = null;
  sessionFromHash = null;
}
