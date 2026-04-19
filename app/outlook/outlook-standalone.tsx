"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Mail, Loader2 } from "lucide-react";
import { MyRuntimeProvider } from "../MyRuntimeProvider";
import { Thread } from "@/components/assistant-ui/thread";

// Office.js global type declaration
declare const Office: any;

interface EmailContext {
  subject?: string;
  from?: string;
  to?: string[];
  body?: string;
  itemType?: string;
  cc?: string[];
  bcc?: string[];
}

export function OutlookStandalone() {
  const [isOfficeReady, setIsOfficeReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [emailContext, setEmailContext] = useState<EmailContext | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Office.js
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (typeof Office !== 'undefined' && Office.context) {
        setIsOfficeReady(true);
      } else if (typeof Office !== 'undefined') {
        Office.onReady(() => {
          setIsOfficeReady(true);
        });
      } else {
        setIsOfficeReady(true);
      }
    }
  }, []);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      
      // Check for tokens in URL hash
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        try {
          const params = new URLSearchParams(hash.substring(1));
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token) {
            const { data, error } = await supabase.auth.setSession({
              access_token,
              refresh_token: refresh_token || '',
            });

            if (!error && data.session) {
              setIsAuthenticated(true);
              // Clear hash
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
              return;
            }
          }
        } catch (err) {
          console.error('Error parsing tokens:', err);
        }
      }

      // Check existing session
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    if (isOfficeReady) {
      checkAuth();
    }
  }, [isOfficeReady]);

  // Extract email context from Office.js
  useEffect(() => {
    if (!isOfficeReady || !isAuthenticated) return;

    // Try to get from sessionStorage first
    try {
      const stored = sessionStorage.getItem('outlook_email_context');
      if (stored) {
        setEmailContext(JSON.parse(stored));
        sessionStorage.removeItem('outlook_email_context');
        return;
      }
    } catch (e) {
      console.warn('Failed to read sessionStorage:', e);
    }

    // Extract from Office.js if available
    if (typeof Office !== 'undefined' && Office.context?.mailbox?.item) {
      const item = Office.context.mailbox.item;
      const context: EmailContext = {
        itemType: item.itemType,
        subject: typeof item.subject === 'string' ? item.subject : '',
        from: item.from?.emailAddress || item.from?.displayName || '',
        to: item.to?.map((r: any) => r.emailAddress || r.displayName || '').filter(Boolean) || [],
        cc: item.cc?.map((r: any) => r.emailAddress || r.displayName || '').filter(Boolean) || [],
        bcc: item.bcc?.map((r: any) => r.emailAddress || r.displayName || '').filter(Boolean) || [],
        body: '',
      };

      setEmailContext(context);
    }
  }, [isOfficeReady, isAuthenticated]);

  // Handle sign in
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError, data } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (signInError) throw signInError;

      if (data.session) {
        setIsAuthenticated(true);
      } else {
        setError("No session returned. Please try again.");
      }
    } catch (err: any) {
      console.error("Sign in failed:", err);
      setError(err.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  // Loading Office.js
  if (!isOfficeReady) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3 bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-600">Loading Office.js...</p>
      </div>
    );
  }

  // Checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3 bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-600">Checking authentication...</p>
      </div>
    );
  }

  // Sign in form
  if (!isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-sm">
          <div className="flex items-center gap-2 mb-6 justify-center">
            <Mail className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold">Email AI Assistant</h1>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Authenticated - show chat
  return (
    <MyRuntimeProvider>
      <div className="h-screen flex flex-col bg-white">
        {/* Header */}
        <div className="border-b bg-white px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <span className="font-semibold">Email Assistant</span>
            </div>
            {emailContext?.subject && (
              <div className="text-xs text-gray-500 truncate max-w-[200px]" title={emailContext.subject}>
                {emailContext.subject}
              </div>
            )}
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 overflow-hidden">
          <Thread />
        </div>
      </div>
    </MyRuntimeProvider>
  );
}
