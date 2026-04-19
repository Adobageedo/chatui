"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { User, Bell, Shield, Palette, LogOut, Settings, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Navbar } from "@/layout/navbar";
import { useProfile } from "@/hooks/useProfile";
import { ProfileTab } from "@/components/profile/tabs/profile-tab";
import { NotificationsTab } from "@/components/profile/tabs/notifications-tab";
import { PrivacyTab } from "@/components/profile/tabs/privacy-tab";
import { AppearanceTab } from "@/components/profile/tabs/appearance-tab";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";

// ── Navigation items ─────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { value: "profile", label: "Profile", icon: User, description: "Personal info" },
  { value: "notifications", label: "Notifications", icon: Bell, description: "Alerts & emails" },
  { value: "privacy", label: "Privacy", icon: Shield, description: "Data & security" },
  { value: "appearance", label: "Appearance", icon: Palette, description: "Theme & display" },
] as const;

type Section = (typeof NAV_ITEMS)[number]["value"];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [activeSection, setActiveSection] = useState<Section>("profile");

  const {
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
  } = useProfile();

  const initials = (profile.name?.[0] || user?.email?.[0] || "U").toUpperCase();

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full">
        <Sidebar>
          {/* ── Header ─────────────────────────────────────── */}
          <SidebarHeader className="mb-2 border-b h-16">
            <div className="flex items-center justify-between">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton size="lg">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      <Settings className="size-4" />
                    </div>
                    <div className="flex flex-col gap-0.5 leading-none">
                      <span className="font-semibold">Settings</span>
                      <span className="text-xs text-muted-foreground">Account</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </div>
          </SidebarHeader>

          {/* ── Navigation ─────────────────────────────────── */}
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Settings</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV_ITEMS.map(({ value, label, icon: Icon }) => (
                    <SidebarMenuItem key={value}>
                      <SidebarMenuButton
                        isActive={activeSection === value}
                        onClick={() => setActiveSection(value)}
                      >
                        <Icon className="size-4" />
                        <span>{label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarRail />

          {/* ── Footer ─────────────────────────────────────── */}
          <SidebarFooter className="border-t">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" onClick={handleSignOut}>
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                    <LogOut className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold text-destructive">Sign Out</span>
                    <span className="text-xs text-muted-foreground">End session</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        {/* ── Main content ───────────────────────────────── */}
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <Navbar hideLogo={true} />
          </header>

          {isLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="flex-1">
              {/* Compact profile banner */}
              <div className="border-b bg-muted/30 px-6 py-6">
                <div className="mx-auto max-w-3xl flex items-center gap-4">
                  <Avatar className="size-14 ring-2 ring-border">
                    {profile.avatar && <AvatarImage src={profile.avatar} alt={profile.name || "Avatar"} />}
                    <AvatarFallback className="text-lg font-bold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-lg font-semibold truncate">{profile.name || "Your Profile"}</h1>
                    <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Active section content */}
              <div className="mx-auto max-w-3xl px-6 py-8">
                {activeSection === "profile" && (
                  <ProfileTab
                    profile={profile}
                    setProfile={setProfile}
                    isSaving={isSaving}
                    onSave={saveProfile}
                    onDelete={deleteAccount}
                  />
                )}
                {activeSection === "notifications" && (
                  <NotificationsTab
                    notifications={notifications}
                    setNotifications={setNotifications}
                    isSaving={isSaving}
                    onSave={saveNotifications}
                  />
                )}
                {activeSection === "privacy" && (
                  <PrivacyTab
                    privacy={privacy}
                    setPrivacy={setPrivacy}
                    isSaving={isSaving}
                    onSave={savePrivacy}
                    onRequestExport={requestDataExport}
                  />
                )}
                {activeSection === "appearance" && (
                  <AppearanceTab
                    appearance={appearance}
                    setAppearance={setAppearance}
                    isSaving={isSaving}
                    onSave={saveAppearance}
                  />
                )}
              </div>
            </ScrollArea>
          )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
