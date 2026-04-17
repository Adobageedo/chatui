"use client";

import { Palette, Sun, Moon, Monitor } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/profile/section-card";
import { SaveButton } from "@/components/profile/save-button";
import type { Theme, FontSize, AppearanceSettings } from "@/lib/profile/profile.types";
import { cn } from "@/lib/utils";

interface AppearanceTabProps {
  appearance: AppearanceSettings;
  setAppearance: React.Dispatch<React.SetStateAction<AppearanceSettings>>;
  isSaving: boolean;
  onSave: () => void;
}

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ElementType }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const FONT_SIZE_OPTIONS: { value: FontSize; label: string; sampleClass: string }[] = [
  { value: "small", label: "Small", sampleClass: "text-xs" },
  { value: "medium", label: "Medium", sampleClass: "text-sm" },
  { value: "large", label: "Large", sampleClass: "text-lg" },
];

export function AppearanceTab({ appearance, setAppearance, isSaving, onSave }: AppearanceTabProps) {
  const setTheme = (theme: Theme) => setAppearance((prev) => ({ ...prev, theme }));
  const setFontSize = (font_size: FontSize) => setAppearance((prev) => ({ ...prev, font_size }));

  return (
    <SectionCard
      icon={Palette}
      title="Appearance Settings"
      description="Customize how the application looks and feels"
    >
      {/* Theme */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium">Theme</Label>
          <p className="text-sm text-muted-foreground">Select your preferred color scheme</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
            const active = appearance.theme === value;
            return (
              <Button
                key={value}
                variant={active ? "default" : "outline"}
                onClick={() => setTheme(value)}
                className={cn(
                  "h-20 flex-col gap-2",
                  active && "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700",
                )}
              >
                <Icon className="size-5" />
                <span className="text-xs font-medium">{label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Font Size */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium">Font Size</Label>
          <p className="text-sm text-muted-foreground">Adjust text size for better readability</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {FONT_SIZE_OPTIONS.map(({ value, label, sampleClass }) => {
            const active = appearance.font_size === value;
            return (
              <Button
                key={value}
                variant={active ? "default" : "outline"}
                onClick={() => setFontSize(value)}
                className={cn(
                  "h-16",
                  active && "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700",
                )}
              >
                <span className={sampleClass}>{label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <SaveButton onClick={onSave} isSaving={isSaving} label="Save Preferences" />
      </div>
    </SectionCard>
  );
}
