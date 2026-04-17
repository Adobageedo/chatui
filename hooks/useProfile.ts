"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { profileService } from "@/lib/profile/profile.service";
import type {
  Theme,
  FontSize,
  NotificationPreferences,
  PrivacySettings,
  AppearanceSettings,
} from "@/lib/profile/profile.types";

export interface ProfileFormData {
  name: string;
  email: string;
  avatar: string;
  bio: string;
}

export function useProfile() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [profile, setProfile] = useState<ProfileFormData>({
    name: "",
    email: user?.email || "",
    avatar: "",
    bio: "",
  });

  const [notifications, setNotifications] = useState<NotificationPreferences>({
    email_notifications: true,
    thread_updates: true,
    system_alerts: false,
  });

  const [privacy, setPrivacy] = useState<PrivacySettings>({
    data_sharing: false,
    analytics_enabled: true,
  });

  const [appearance, setAppearance] = useState<AppearanceSettings>({
    theme: "system" as Theme,
    font_size: "medium" as FontSize,
  });

  const loadProfile = useCallback(async () => {
    setIsLoading(true);

    const result = await profileService.getProfile();

    if (result.success && result.profile) {
      const p = result.profile;
      setProfile({
        name: p.display_name || "",
        email: user?.email || "",
        avatar: p.avatar_url || "",
        bio: p.bio || "",
      });
      setNotifications({
        email_notifications: p.email_notifications,
        thread_updates: p.thread_updates,
        system_alerts: p.system_alerts,
      });
      setPrivacy({
        data_sharing: p.data_sharing,
        analytics_enabled: p.analytics_enabled,
      });
      setAppearance({
        theme: p.theme,
        font_size: p.font_size,
      });
    } else {
      toast.error(result.error?.message || "Failed to load profile");
    }

    setIsLoading(false);
  }, [user?.email]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const withSaving = useCallback(
    async (fn: () => Promise<{ success: boolean; error?: { message: string } }>, successMsg: string) => {
      setIsSaving(true);
      const result = await fn();
      setIsSaving(false);

      if (result.success) {
        toast.success(successMsg);
      } else {
        toast.error(result.error?.message || "Something went wrong");
      }

      return result;
    },
    [],
  );

  const saveProfile = useCallback(
    () =>
      withSaving(
        () =>
          profileService.updateProfile({
            display_name: profile.name,
            avatar_url: profile.avatar,
            bio: profile.bio,
          }),
        "Profile updated successfully!",
      ),
    [profile, withSaving],
  );

  const saveNotifications = useCallback(
    () => withSaving(() => profileService.updateNotifications(notifications), "Notification preferences saved!"),
    [notifications, withSaving],
  );

  const savePrivacy = useCallback(
    () => withSaving(() => profileService.updatePrivacy(privacy), "Privacy settings saved!"),
    [privacy, withSaving],
  );

  const saveAppearance = useCallback(
    () => withSaving(() => profileService.updateAppearance(appearance), "Appearance preferences saved!"),
    [appearance, withSaving],
  );

  const requestDataExport = useCallback(
    () =>
      withSaving(
        () => profileService.requestDataExport(),
        "Data export requested! You'll receive an email when ready.",
      ),
    [withSaving],
  );

  const deleteAccount = useCallback(async () => {
    setIsSaving(true);
    const result = await profileService.deleteAccount();
    setIsSaving(false);

    if (result.success) {
      toast.success("Account deleted.");
      router.push("/login");
    } else {
      toast.error(result.error?.message || "Failed to delete account");
    }
  }, [router]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.push("/login");
  }, [signOut, router]);

  return {
    user,
    isLoading,
    isSaving,

    profile,
    setProfile,
    notifications,
    setNotifications,
    privacy,
    setPrivacy,
    appearance,
    setAppearance,

    saveProfile,
    saveNotifications,
    savePrivacy,
    saveAppearance,
    requestDataExport,
    deleteAccount,
    handleSignOut,
  };
}
