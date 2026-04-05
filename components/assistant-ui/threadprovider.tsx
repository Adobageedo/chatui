import { useMemo, type ReactNode } from "react";
import { RuntimeAdapterProvider } from "@assistant-ui/react";
import { useThreadHistoryAdapter } from "@/lib/chat/thread-history-adapter";
import { useSuggestionAdapter } from "@/lib/chat/suggestion-adapter";

/**
 * Thread Provider Component
 * Fournit les adapters spécifiques à chaque thread
 */
export function ThreadProvider({ children }: { children: ReactNode }) {
  const history = useThreadHistoryAdapter();
  const suggestion = useSuggestionAdapter();

  const adapters = useMemo(
    () => ({
      history,
      suggestion,
    }),
    [history, suggestion]
  );

  return (
    <RuntimeAdapterProvider adapters={adapters}>
      {children}
    </RuntimeAdapterProvider>
  );
}
