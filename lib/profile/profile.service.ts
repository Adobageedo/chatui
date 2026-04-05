/**
 * Profile Service
 * Handles all profile and preference management operations
 */

import { createClient } from "@/lib/supabase/client";
import type {
  UserProfile,
  ProfileUpdateData,
  NotificationPreferences,
  PrivacySettings,
  AppearanceSettings,
  OnboardingData,
  ProfileResponse,
  UpdateProfileResponse,
  CompleteOnboardingResponse,
} from "./profile.types";

class ProfileService {
  private supabase = createClient();

  /**
   * Get current user's profile
   */
  async getProfile(): Promise<ProfileResponse> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();

      if (authError || !user) {
        return {
          success: false,
          error: { message: "Not authenticated" },
        };
      }

      const { data: profile, error } = await this.supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Profile fetch error:", error);
        return {
          success: false,
          error: { message: error.message, code: error.code },
        };
      }

      return {
        success: true,
        profile: profile as UserProfile,
      };
    } catch (error) {
      console.error("Get profile error:", error);
      return {
        success: false,
        error: { message: "Failed to fetch profile" },
      };
    }
  }

  /**
   * Update user profile information
   */
  async updateProfile(data: ProfileUpdateData): Promise<UpdateProfileResponse> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();

      if (authError || !user) {
        return {
          success: false,
          error: { message: "Not authenticated" },
        };
      }

      const { data: profile, error } = await this.supabase
        .from("user_profiles")
        .update(data)
        .eq("id", user.id)
        .select()
        .single();

      if (error) {
        console.error("Profile update error:", error);
        return {
          success: false,
          error: { message: error.message, code: error.code },
        };
      }

      return {
        success: true,
        profile: profile as UserProfile,
      };
    } catch (error) {
      console.error("Update profile error:", error);
      return {
        success: false,
        error: { message: "Failed to update profile" },
      };
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotifications(preferences: NotificationPreferences): Promise<UpdateProfileResponse> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();

      if (authError || !user) {
        return {
          success: false,
          error: { message: "Not authenticated" },
        };
      }

      const { data: profile, error } = await this.supabase
        .from("user_profiles")
        .update(preferences)
        .eq("id", user.id)
        .select()
        .single();

      if (error) {
        console.error("Notification update error:", error);
        return {
          success: false,
          error: { message: error.message, code: error.code },
        };
      }

      return {
        success: true,
        profile: profile as UserProfile,
      };
    } catch (error) {
      console.error("Update notifications error:", error);
      return {
        success: false,
        error: { message: "Failed to update notifications" },
      };
    }
  }

  /**
   * Update privacy settings
   */
  async updatePrivacy(settings: PrivacySettings): Promise<UpdateProfileResponse> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();

      if (authError || !user) {
        return {
          success: false,
          error: { message: "Not authenticated" },
        };
      }

      const { data: profile, error } = await this.supabase
        .from("user_profiles")
        .update(settings)
        .eq("id", user.id)
        .select()
        .single();

      if (error) {
        console.error("Privacy update error:", error);
        return {
          success: false,
          error: { message: error.message, code: error.code },
        };
      }

      return {
        success: true,
        profile: profile as UserProfile,
      };
    } catch (error) {
      console.error("Update privacy error:", error);
      return {
        success: false,
        error: { message: "Failed to update privacy settings" },
      };
    }
  }

  /**
   * Update appearance settings
   */
  async updateAppearance(settings: AppearanceSettings): Promise<UpdateProfileResponse> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();

      if (authError || !user) {
        return {
          success: false,
          error: { message: "Not authenticated" },
        };
      }

      const { data: profile, error } = await this.supabase
        .from("user_profiles")
        .update(settings)
        .eq("id", user.id)
        .select()
        .single();

      if (error) {
        console.error("Appearance update error:", error);
        return {
          success: false,
          error: { message: error.message, code: error.code },
        };
      }

      return {
        success: true,
        profile: profile as UserProfile,
      };
    } catch (error) {
      console.error("Update appearance error:", error);
      return {
        success: false,
        error: { message: "Failed to update appearance" },
      };
    }
  }

  /**
   * Complete onboarding process
   */
  async completeOnboarding(data: OnboardingData): Promise<CompleteOnboardingResponse> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();

      if (authError || !user) {
        return {
          success: false,
          error: { message: "Not authenticated" },
        };
      }

      const { data: profile, error } = await this.supabase
        .from("user_profiles")
        .update({
          use_case: data.use_case,
          experience_level: data.experience_level,
          email_notifications: data.notifications,
          onboarding_completed: true,
          onboarding_step: 3,
        })
        .eq("id", user.id)
        .select()
        .single();

      if (error) {
        console.error("Onboarding completion error:", error);
        return {
          success: false,
          error: { message: error.message, code: error.code },
        };
      }

      // Also update user metadata in auth
      await this.supabase.auth.updateUser({
        data: {
          onboarding_completed: true,
        },
      });

      return {
        success: true,
        profile: profile as UserProfile,
      };
    } catch (error) {
      console.error("Complete onboarding error:", error);
      return {
        success: false,
        error: { message: "Failed to complete onboarding" },
      };
    }
  }

  /**
   * Request data export
   */
  async requestDataExport(): Promise<{ success: boolean; error?: { message: string } }> {
    try {
      // TODO: Implement async job to export user data
      // For now, just log the request
      console.log("Data export requested");
      
      return {
        success: true,
      };
    } catch (error) {
      console.error("Data export request error:", error);
      return {
        success: false,
        error: { message: "Failed to request data export" },
      };
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(): Promise<{ success: boolean; error?: { message: string } }> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();

      if (authError || !user) {
        return {
          success: false,
          error: { message: "Not authenticated" },
        };
      }

      // Delete user profile (cascade will handle related data)
      const { error: deleteError } = await this.supabase
        .from("user_profiles")
        .delete()
        .eq("id", user.id);

      if (deleteError) {
        console.error("Account deletion error:", deleteError);
        return {
          success: false,
          error: { message: deleteError.message },
        };
      }

      // Sign out
      await this.supabase.auth.signOut();

      return {
        success: true,
      };
    } catch (error) {
      console.error("Delete account error:", error);
      return {
        success: false,
        error: { message: "Failed to delete account" },
      };
    }
  }
}

export const profileService = new ProfileService();
