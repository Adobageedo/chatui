import type { ReactNode } from "react";

/**
 * Thread Provider Component for AI SDK v6
 * 
 * Note: With useChatRuntime, thread-specific adapters are passed directly
 * to the runtime, not via RuntimeAdapterProvider. This is a no-op wrapper
 * for compatibility with thread list adapter structure.
 */
export function ThreadProviderV6({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
