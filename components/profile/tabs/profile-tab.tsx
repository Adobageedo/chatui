"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SectionCard } from "@/components/profile/section-card";
import { SaveButton } from "@/components/profile/save-button";
import { User } from "lucide-react";
import type { ProfileFormData } from "@/hooks/useProfile";

interface ProfileTabProps {
  profile: ProfileFormData;
  setProfile: React.Dispatch<React.SetStateAction<ProfileFormData>>;
  isSaving: boolean;
  onSave: () => void;
  onDelete: () => void;
}

export function ProfileTab({ profile, setProfile, isSaving, onSave, onDelete }: ProfileTabProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const updateField = <K extends keyof ProfileFormData>(key: K, value: ProfileFormData[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <SectionCard
      icon={User}
      title="Profile Information"
      description="Update your personal information and how others see you"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Display Name</Label>
          <Input
            id="name"
            value={profile.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" type="email" value={profile.email} disabled className="bg-muted" />
          <p className="text-xs text-muted-foreground">
            Email cannot be changed. Contact support if needed.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="avatar">Avatar URL</Label>
        <Input
          id="avatar"
          value={profile.avatar}
          onChange={(e) => updateField("avatar", e.target.value)}
          placeholder="https://example.com/avatar.jpg"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={profile.bio}
          onChange={(e) => updateField("bio", e.target.value)}
          placeholder="Tell us about yourself..."
          className="min-h-[100px] resize-none"
        />
      </div>

      <Separator />

      {/* Danger: Delete Account */}
      <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <div>
          <h3 className="text-sm font-semibold text-destructive">Delete Account</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Permanently delete your account and all data
          </p>
        </div>
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="gap-2">
              <Trash2 className="size-4" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your account and remove
                all your data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  setDeleteOpen(false);
                  onDelete();
                }}
              >
                Yes, delete my account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <SaveButton onClick={onSave} isSaving={isSaving} />
      </div>
    </SectionCard>
  );
}
