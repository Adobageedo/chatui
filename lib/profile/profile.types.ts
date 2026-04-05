/**
 * Profile and Preferences Type Definitions
 */

export interface UserProfile {
  id: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  onboarding_completed: boolean;
  onboarding_step: number;
  use_case?: UseCase;
  experience_level?: ExperienceLevel;
  email_notifications: boolean;
  thread_updates: boolean;
  system_alerts: boolean;
  data_sharing: boolean;
  analytics_enabled: boolean;
  theme: Theme;
  font_size: FontSize;
  created_at: string;
  updated_at: string;
}

export type UseCase = 'personal' | 'work' | 'education' | 'other';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type Theme = 'light' | 'dark' | 'system';
export type FontSize = 'small' | 'medium' | 'large';

export interface ProfileUpdateData {
  display_name?: string;
  avatar_url?: string;
  bio?: string;
}

export interface NotificationPreferences {
  email_notifications: boolean;
  thread_updates: boolean;
  system_alerts: boolean;
}

export interface PrivacySettings {
  data_sharing: boolean;
  analytics_enabled: boolean;
}

export interface AppearanceSettings {
  theme: Theme;
  font_size: FontSize;
}

export interface OnboardingData {
  use_case: UseCase;
  experience_level: ExperienceLevel;
  notifications: boolean;
}

export interface ProfileResponse {
  success: boolean;
  profile?: UserProfile;
  error?: {
    message: string;
    code?: string;
  };
}

export interface UpdateProfileResponse {
  success: boolean;
  profile?: UserProfile;
  error?: {
    message: string;
    code?: string;
  };
}

export interface CompleteOnboardingResponse {
  success: boolean;
  profile?: UserProfile;
  error?: {
    message: string;
    code?: string;
  };
}
