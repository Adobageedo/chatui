"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function OutlookSigninPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Check if we have a token in URL (from previous auth)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      // Token is present, let the main app handle it
      window.location.href = "/outlook?outlook=true" + hash;
      return;
    }

    // Otherwise check for existing session
    const checkExistingSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        window.location.href = "/outlook?outlook=true";
      } else {
        setIsCheckingSession(false);
      }
    };
    checkExistingSession();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error: signInError, data } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      if (data.session) {
        // Pass tokens in URL hash - cookies don't persist in Outlook WebView
        const { access_token, refresh_token, expires_in, token_type } = data.session;
        const hash = `#access_token=${access_token}&refresh_token=${refresh_token}&expires_in=${expires_in}&token_type=${token_type}`;
        console.log("[OutlookSignin] Redirecting with tokens in hash");
        window.location.href = "/outlook?outlook=true" + hash;
      } else {
        setError("No session returned. Please try again.");
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error("[OutlookSignin] Sign in failed:", err);
      setError(err.message || "Failed to sign in");
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6", padding: "16px" }}>
      <div style={{ background: "#fff", borderRadius: "8px", padding: "32px", width: "100%", maxWidth: "360px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px", textAlign: "center" }}>Sign in</h1>
        <p style={{ fontSize: "13px", color: "#6b7280", textAlign: "center", marginBottom: "24px" }}>Email AI Assistant</p>
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "4px", padding: "10px 12px", marginBottom: "16px", fontSize: "13px", color: "#b91c1c" }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSignIn}>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>
          <button
            type="submit" disabled={isLoading}
            style={{ width: "100%", padding: "10px", background: "#0078d4", color: "#fff", border: "none", borderRadius: "4px", fontSize: "14px", fontWeight: 600, cursor: isLoading ? "not-allowed" : "pointer", opacity: isLoading ? 0.7 : 1 }}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
