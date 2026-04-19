"use client";

import { useEffect, useState } from "react";
import { Assistant } from "../chat/assistant";
import { Mail, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface EmailContext {
  subject?: string;
  from?: string;
  to?: string[];
  body?: string;
  itemType?: string;
  cc?: string[];
  bcc?: string[];
}

export function OutlookAssistant() {
  const [isOutlookMode, setIsOutlookMode] = useState(false);
  const [emailContext, setEmailContext] = useState<EmailContext | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);


  useEffect(() => {
    console.log('[OutlookAssistant] starting auth check...');
    const supabase = createClient();

    const checkAuth = async () => {
      // First, check if we have tokens in URL hash (passed from sign-in page)
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        console.log('[OutlookAssistant] Found tokens in URL hash, setting session...');
        try {
          const params = new URLSearchParams(hash.substring(1));
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token) {
            const { data, error } = await supabase.auth.setSession({
              access_token,
              refresh_token: refresh_token || '',
            });

            if (error) {
              console.error('[OutlookAssistant] Failed to set session:', error);
              setIsAuthenticated(false);
            } else if (data.session) {
              console.log('[OutlookAssistant] Session established from tokens');
              setIsAuthenticated(true);
            } else {
              setIsAuthenticated(false);
            }
            return;
          }
        } catch (err) {
          console.error('[OutlookAssistant] Error parsing tokens:', err);
        }
      }

      // Otherwise check for existing session (with retries for embedded browser)
      let attempts = 0;
      const maxAttempts = 10;

      const tryGetSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        console.log(`[OutlookAssistant] auth check attempt ${attempts + 1}, session:`, !!session);

        if (session) {
          setIsAuthenticated(true);
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(tryGetSession, 300);
        } else {
          setIsAuthenticated(false);
        }
      };

      await tryGetSession();
    };

    checkAuth();
    // No onAuthStateChange listener - avoiding race conditions with singleton client
  }, []);

  useEffect(() => {
    // Redirect to signin if not authenticated
    if (isAuthenticated === false) {
      window.location.href = "/outlook/signin";
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const urlParams = new URLSearchParams(window.location.search);
    const outlookMode = urlParams.get('outlook') === 'true';
    setIsOutlookMode(outlookMode);

    if (outlookMode) {
      // Read email context stored by taskpane.html before redirecting here
      try {
        const stored = sessionStorage.getItem('outlook_email_context');
        if (stored) {
          const ctx = JSON.parse(stored);
          console.log('[OutlookAssistant] loaded email context from sessionStorage:', ctx);
          setEmailContext(ctx);
          sessionStorage.removeItem('outlook_email_context');
        }
      } catch (e) {
        console.warn('[OutlookAssistant] failed to read sessionStorage context:', e);
      }
      setIsLoadingContext(false);
    } else {
      setIsLoadingContext(false);
    }
  }, [isAuthenticated]);

  console.log('[OutlookAssistant] render', { isAuthenticated, isOutlookMode, isLoadingContext });

  if (isAuthenticated === null) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-600">Checking authentication...</p>
      </div>
    );
  }

  // While we know auth status but haven't determined outlook mode yet, keep loading
  if (isAuthenticated && isLoadingContext && !isOutlookMode) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isOutlookMode) {
    return (
      <div className="h-screen flex flex-col bg-background">
        {/* Outlook Header */}
        <div className="border-b bg-background/95 backdrop-blur px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <span className="font-semibold">Email Assistant</span>
            </div>
            {emailContext?.subject && (
              <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={emailContext.subject}>
                {emailContext.subject}
              </div>
            )}
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 relative overflow-hidden">
          {isLoadingContext && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading email context...</span>
              </div>
            </div>
          )}
          <Assistant />
        </div>
      </div>
    );
  }

  // Regular web mode - show info page
  return (
    <div className="min-h-screen">
      <div className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">Email Assistant</span>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Outlook Add-in</h2>
          <p className="text-muted-foreground">
            This page is designed to work within the Outlook add-in. 
            Please access it through Outlook to use the email assistant features.
          </p>
        </div>
      </div>
    </div>
  );
}
