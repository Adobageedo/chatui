"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import type { ReactNode } from "react";

function ActivityTracker() {
  useActivityTracker();
  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ActivityTracker />
      {children}
    </AuthProvider>
  );
}
