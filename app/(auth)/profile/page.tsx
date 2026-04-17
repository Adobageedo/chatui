"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Bell, Shield, Palette, LogOut } from "lucide-react";
import { Navbar } from "@/layout/navbar";
import { useProfile } from "@/hooks/useProfile";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileSkeleton } from "@/components/profile/profile-skeleton";
import { ProfileTab } from "@/components/profile/tabs/profile-tab";
import { NotificationsTab } from "@/components/profile/tabs/notifications-tab";
import { PrivacyTab } from "@/components/profile/tabs/privacy-tab";
import { AppearanceTab } from "@/components/profile/tabs/appearance-tab";

const TAB_ITEMS = [
  { value: "profile", label: "Profile", icon: User },
  { value: "notifications", label: "Notifications", icon: Bell },
  { value: "privacy", label: "Privacy", icon: Shield },
  { value: "appearance", label: "Appearance", icon: Palette },
] as const;

export default function ProfilePage() {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      {/* Navbar */}
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <Navbar />
        </div>
      </div>

      {isLoading ? (
        <ProfileSkeleton />
      ) : (
        <>
          <ProfileHeader
            name={profile.name}
            email={user?.email}
            avatarUrl={profile.avatar}
            user={user}
          />

          {/* Main Content */}
          <div className="container max-w-5xl mx-auto px-4 py-8">
            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 h-auto p-1">
                {TAB_ITEMS.map(({ value, label, icon: Icon }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
                  >
                    <Icon className="size-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="profile">
                <ProfileTab
                  profile={profile}
                  setProfile={setProfile}
                  isSaving={isSaving}
                  onSave={saveProfile}
                  onDelete={deleteAccount}
                />
              </TabsContent>

              <TabsContent value="notifications">
                <NotificationsTab
                  notifications={notifications}
                  setNotifications={setNotifications}
                  isSaving={isSaving}
                  onSave={saveNotifications}
                />
              </TabsContent>

              <TabsContent value="privacy">
                <PrivacyTab
                  privacy={privacy}
                  setPrivacy={setPrivacy}
                  isSaving={isSaving}
                  onSave={savePrivacy}
                  onRequestExport={requestDataExport}
                />
              </TabsContent>

              <TabsContent value="appearance">
                <AppearanceTab
                  appearance={appearance}
                  setAppearance={setAppearance}
                  isSaving={isSaving}
                  onSave={saveAppearance}
                />
              </TabsContent>
            </Tabs>

            {/* Danger Zone */}
            <div className="mt-8">
              <Card className="border-2 border-destructive/20">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>Irreversible actions that affect your account</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                    <div>
                      <h3 className="text-sm font-semibold text-destructive">Sign Out</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        End your current session and return to login
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleSignOut}
                      className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="size-4" />
                      Sign Out
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
