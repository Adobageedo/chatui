"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface ReasoningContextType {
  reasoningEnabled: boolean;
  setReasoningEnabled: (enabled: boolean) => void;
}

const ReasoningContext = createContext<ReasoningContextType | undefined>(undefined);

export function ReasoningProvider({ children }: { children: ReactNode }) {
  const [reasoningEnabled, setReasoningEnabled] = useState(false);

  // Expose reasoning state to window for chat adapter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__reasoningEnabled__ = reasoningEnabled;
    }
  }, [reasoningEnabled]);

  return (
    <ReasoningContext.Provider value={{ reasoningEnabled, setReasoningEnabled }}>
      {children}
    </ReasoningContext.Provider>
  );
}

export function useReasoning() {
  const context = useContext(ReasoningContext);
  if (!context) {
    throw new Error("useReasoning must be used within ReasoningProvider");
  }
  return context;
}
