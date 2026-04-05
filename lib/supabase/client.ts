import { createBrowserClient } from '@supabase/ssr'
import { ENV } from '@/config';

export function createClient() {
  return createBrowserClient(
    ENV.supabase.url,
    ENV.supabase.anonKey
  )
}
