"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/auth/auth.service";
import { useAuthContext } from "@/contexts/AuthContext";
import type { LoginCredentials, SignupCredentials, AuthError } from "@/lib/auth/auth.types";

export function useAuth() {
  const { user, session, isLoading, isAuthenticated, refreshAuth } = useAuthContext();
  const router = useRouter();
  const [error, setError] = useState<AuthError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const login = async (credentials: LoginCredentials) => {
    setIsSubmitting(true);
    setError(null);

    const result = await authService.login(credentials);
    
    setIsSubmitting(false);

    if (result.success) {
      await refreshAuth();
      
      // Check for redirect parameter in URL
      const urlParams = new URLSearchParams(window.location.search);
      const redirectTo = urlParams.get('redirect');
      
      if (user?.user_metadata?.onboarding_completed === false) {
        router.push("/onboarding");
      } else if (redirectTo) {
        // Redirect to intended destination
        router.push(redirectTo);
      } else {
        router.push("/chat");
      }
      
      return { success: true };
    } else {
      setError(result.error);
      return { success: false, error: result.error };
    }
  };

  const signup = async (credentials: SignupCredentials) => {
    setIsSubmitting(true);
    setError(null);

    const result = await authService.signup(credentials);
    
    setIsSubmitting(false);

    if (result.success) {
      router.push("/login?verified=false");
      return { success: true };
    } else {
      setError(result.error);
      return { success: false, error: result.error };
    }
  };

  const logout = async () => {
    setIsSubmitting(true);
    setError(null);

    const result = await authService.logout();
    
    setIsSubmitting(false);

    if (result.success) {
      await refreshAuth();
      router.push("/login");
      return { success: true };
    } else {
      setError(result.error);
      return { success: false, error: result.error };
    }
  };

  const resetPassword = async (email: string) => {
    setIsSubmitting(true);
    setError(null);

    const result = await authService.resetPassword(email);
    
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
    }

    return result;
  };

  const completeOnboarding = async () => {
    setIsSubmitting(true);
    setError(null);

    const result = await authService.completeOnboarding();
    
    setIsSubmitting(false);

    if (result.success) {
      await refreshAuth();
      router.push("/chat");
      return { success: true };
    } else {
      setError(result.error);
      return { success: false, error: result.error };
    }
  };

  return {
    user,
    session,
    isLoading,
    isAuthenticated,
    isSubmitting,
    error,
    login,
    signup,
    logout,
    signOut: logout, // Alias for logout
    resetPassword,
    completeOnboarding,
    clearError: () => setError(null),
  };
}
