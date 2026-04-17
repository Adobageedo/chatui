"use client";

import { Bell } from "lucide-react";
import { SectionCard } from "@/components/profile/section-card";
import { SettingRow } from "@/components/profile/setting-row";
import { SaveButton } from "@/components/profile/save-button";
import type { NotificationPreferences } from "@/lib/profile/profile.types";

interface NotificationsTabProps {
  notifications: NotificationPreferences;
  setNotifications: React.Dispatch<React.SetStateAction<NotificationPreferences>>;
  isSaving: boolean;
  onSave: () => void;
}

export function NotificationsTab({ notifications, setNotifications, isSaving, onSave }: NotificationsTabProps) {
  const toggle = <K extends keyof NotificationPreferences>(key: K, value: boolean) => {
    setNotifications((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <SectionCard
      icon={Bell}
      title="Notification Preferences"
      description="Choose how you want to be notified about updates"
    >
      <SettingRow
        label="Email Notifications"
        description="Receive email notifications for important updates"
        checked={notifications.email_notifications}
        onCheckedChange={(v) => toggle("email_notifications", v)}
      />
      <SettingRow
        label="Thread Updates"
        description="Get notified when threads you follow have new messages"
        checked={notifications.thread_updates}
        onCheckedChange={(v) => toggle("thread_updates", v)}
      />
      <SettingRow
        label="System Alerts"
        description="Receive alerts about system maintenance and updates"
        checked={notifications.system_alerts}
        onCheckedChange={(v) => toggle("system_alerts", v)}
      />

      <div className="flex justify-end pt-2">
        <SaveButton onClick={onSave} isSaving={isSaving} label="Save Preferences" />
      </div>
    </SectionCard>
  );
}
