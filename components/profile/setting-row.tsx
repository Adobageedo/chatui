"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface SettingRowProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function SettingRow({ label, description, checked, onCheckedChange }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50">
      <div className="space-y-0.5">
        <Label className="font-medium">{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
