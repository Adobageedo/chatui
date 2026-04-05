"use client";

import { useEffect } from "react";
import { sessionService } from "@/lib/auth/session.service";
import { useAuthContext } from "@/contexts/AuthContext";

/**
 * Track user activity to prevent auto-logout during active usage
 */
export function useActivityTracker() {
  const { isAuthenticated } = useAuthContext();

  useEffect(() => {
    if (!isAuthenticated) return;

    const activityEvents = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    const handleActivity = () => {
      sessionService.recordActivity();
    };

    activityEvents.forEach((event) => {
      document.addEventListener(event, handleActivity);
    });

    return () => {
      activityEvents.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated]);
}
