"use client";

import { Shield, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SectionCard } from "@/components/profile/section-card";
import { SettingRow } from "@/components/profile/setting-row";
import { SaveButton } from "@/components/profile/save-button";
import type { PrivacySettings } from "@/lib/profile/profile.types";

interface PrivacyTabProps {
  privacy: PrivacySettings;
  setPrivacy: React.Dispatch<React.SetStateAction<PrivacySettings>>;
  isSaving: boolean;
  onSave: () => void;
  onRequestExport: () => void;
}

export function PrivacyTab({ privacy, setPrivacy, isSaving, onSave, onRequestExport }: PrivacyTabProps) {
  const toggle = <K extends keyof PrivacySettings>(key: K, value: boolean) => {
    setPrivacy((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <SectionCard
      icon={Shield}
      title="Privacy & Security"
      description="Manage your privacy settings and data sharing preferences"
    >
      <SettingRow
        label="Data Sharing"
        description="Allow sharing anonymized data to improve the service"
        checked={privacy.data_sharing}
        onCheckedChange={(v) => toggle("data_sharing", v)}
      />
      <SettingRow
        label="Analytics"
        description="Help us improve by allowing usage analytics"
        checked={privacy.analytics_enabled}
        onCheckedChange={(v) => toggle("analytics_enabled", v)}
      />

      <Separator />

      <div className="rounded-lg border bg-muted/40 p-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Download className="size-4" />
          Data Export
        </h3>
        <p className="text-sm text-muted-foreground mt-1 mb-3">
          Download all your data in a portable format
        </p>
        <Button variant="outline" size="sm" onClick={onRequestExport} disabled={isSaving} className="gap-2">
          <Download className="size-4" />
          Request Data Export
        </Button>
      </div>

      <div className="flex justify-end pt-2">
        <SaveButton onClick={onSave} isSaving={isSaving} label="Save Settings" />
      </div>
    </SectionCard>
  );
}
