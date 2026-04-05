"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { User, Bell, Shield, Palette, LogOut, Loader2, Download, Trash2, Check, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { profileService } from "@/lib/profile/profile.service";
import type { Theme, FontSize } from "@/lib/profile/profile.types";
import { Navbar } from "@/layout/navbar";

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Profile settings state
  const [profile, setProfile] = useState({
    name: "",
    email: user?.email || "",
    avatar: "",
    bio: "",
  });

  // Notification settings state
  const [notifications, setNotifications] = useState({
    email_notifications: true,
    thread_updates: true,
    system_alerts: false,
  });

  // Privacy settings state
  const [privacy, setPrivacy] = useState({
    data_sharing: false,
    analytics_enabled: true,
  });

  // Appearance settings state
  const [appearance, setAppearance] = useState({
    theme: "system" as Theme,
    font_size: "medium" as FontSize,
  });

  // Load profile data on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);

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
      setError(result.error?.message || "Failed to load profile");
    }

    setIsLoading(false);
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setError(null);

    const result = await profileService.updateProfile({
      display_name: profile.name,
      avatar_url: profile.avatar,
      bio: profile.bio,
    });

    setIsSaving(false);

    if (result.success) {
      showSuccess("Profile updated successfully!");
    } else {
      setError(result.error?.message || "Failed to update profile");
    }
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    setError(null);

    const result = await profileService.updateNotifications(notifications);

    setIsSaving(false);

    if (result.success) {
      showSuccess("Notification preferences saved!");
    } else {
      setError(result.error?.message || "Failed to save notifications");
    }
  };

  const handleSavePrivacy = async () => {
    setIsSaving(true);
    setError(null);

    const result = await profileService.updatePrivacy(privacy);

    setIsSaving(false);

    if (result.success) {
      showSuccess("Privacy settings saved!");
    } else {
      setError(result.error?.message || "Failed to save privacy settings");
    }
  };

  const handleSaveAppearance = async () => {
    setIsSaving(true);
    setError(null);

    const result = await profileService.updateAppearance(appearance);

    setIsSaving(false);

    if (result.success) {
      showSuccess("Appearance preferences saved!");
    } else {
      setError(result.error?.message || "Failed to save appearance");
    }
  };

  const handleRequestDataExport = async () => {
    setIsSaving(true);
    const result = await profileService.requestDataExport();
    setIsSaving(false);

    if (result.success) {
      showSuccess("Data export requested! You'll receive an email when ready.");
    } else {
      setError(result.error?.message || "Failed to request data export");
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return;
    }

    setIsSaving(true);
    const result = await profileService.deleteAccount();
    setIsSaving(false);

    if (result.success) {
      router.push("/login");
    } else {
      setError(result.error?.message || "Failed to delete account");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
        {/* Navbar */}
        <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container max-w-7xl mx-auto px-4 py-4">
            <Navbar />
          </div>
        </div>

        <div className="container max-w-5xl mx-auto px-4 py-20 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-sm text-muted-foreground">Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      {/* Navbar */}
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <Navbar />
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 border-b">
        <div className="container max-w-5xl mx-auto px-4 py-12">
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center text-4xl font-bold bg-gradient-to-br from-blue-600 to-indigo-600 text-white ring-4 ring-white/50">
                {(profile.name?.[0] || user?.email?.[0] || "U").toUpperCase()}
              </div>
            </div>
            
            {/* User Info */}
            <div className="flex-1 text-white">
              <h1 className="text-3xl font-bold mb-1">
                {profile.name || "Your Profile"}
              </h1>
              <p className="text-blue-100 text-sm">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-5xl mx-auto px-4 py-8">
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-white border shadow-sm h-auto p-1">
          <TabsTrigger value="profile" className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Privacy</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card className="border-0 shadow-md bg-white">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal information and how others see you
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">Display Name</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="Your name"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="bg-gray-50 h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed. Contact support if needed.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar" className="text-sm font-medium">Avatar URL</Label>
                <Input
                  id="avatar"
                  value={profile.avatar}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfile({ ...profile, avatar: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-sm font-medium">Bio</Label>
                <textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                <div>
                  <h3 className="font-semibold text-sm text-red-900">Delete Account</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Permanently delete your account and all data
                  </p>
                </div>
                <Button variant="destructive" size="sm" onClick={handleDeleteAccount} disabled={isSaving} className="gap-2">
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => router.back()} className="h-11">
                  Cancel
                </Button>
                <Button onClick={handleSaveProfile} disabled={isSaving} className="h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card className="border-0 shadow-md bg-white">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Choose how you want to be notified about updates
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="space-y-0.5">
                  <Label className="font-medium">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email notifications for important updates
                  </p>
                </div>
                <Switch
                  checked={notifications.email_notifications}
                  onCheckedChange={(checked: boolean) =>
                    setNotifications({ ...notifications, email_notifications: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="space-y-0.5">
                  <Label className="font-medium">Thread Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when threads you follow have new messages
                  </p>
                </div>
                <Switch
                  checked={notifications.thread_updates}
                  onCheckedChange={(checked: boolean) =>
                    setNotifications({ ...notifications, thread_updates: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="space-y-0.5">
                  <Label className="font-medium">System Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive alerts about system maintenance and updates
                  </p>
                </div>
                <Switch
                  checked={notifications.system_alerts}
                  onCheckedChange={(checked: boolean) =>
                    setNotifications({ ...notifications, system_alerts: checked })
                  }
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveNotifications} disabled={isSaving} className="h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Preferences"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-4">
          <Card className="border-0 shadow-md bg-white">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Privacy & Security</CardTitle>
                  <CardDescription>
                    Manage your privacy settings and data sharing preferences
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="space-y-0.5">
                  <Label className="font-medium">Data Sharing</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow sharing anonymized data to improve the service
                  </p>
                </div>
                <Switch
                  checked={privacy.data_sharing}
                  onCheckedChange={(checked: boolean) =>
                    setPrivacy({ ...privacy, data_sharing: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="space-y-0.5">
                  <Label className="font-medium">Analytics</Label>
                  <p className="text-sm text-muted-foreground">
                    Help us improve by allowing usage analytics
                  </p>
                </div>
                <Switch
                  checked={privacy.analytics_enabled}
                  onCheckedChange={(checked: boolean) =>
                    setPrivacy({ ...privacy, analytics_enabled: checked })
                  }
                />
              </div>

              <Separator />

              <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Data Export
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Download all your data in a portable format
                </p>
                <Button variant="outline" size="sm" onClick={handleRequestDataExport} disabled={isSaving} className="gap-2">
                  <Download className="w-4 h-4" />
                  Request Data Export
                </Button>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSavePrivacy} disabled={isSaving} className="h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Settings"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-4">
          <Card className="border-0 shadow-md bg-white">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                  <Palette className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Appearance Settings</CardTitle>
                  <CardDescription>
                    Customize how the application looks and feels
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Theme</Label>
                <p className="text-sm text-muted-foreground">Select your preferred color scheme</p>
                <div className="grid grid-cols-3 gap-3">
                  {(["light", "dark", "system"] as Theme[]).map((theme) => (
                    <Button
                      key={theme}
                      variant={appearance.theme === theme ? "default" : "outline"}
                      onClick={() => setAppearance({ ...appearance, theme })}
                      className={`capitalize h-20 flex flex-col gap-2 ${
                        appearance.theme === theme 
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" 
                          : ""
                      }`}
                    >
                      {theme === "light" && "☀️"}
                      {theme === "dark" && "🌙"}
                      {theme === "system" && "💻"}
                      <span>{theme}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-medium">Font Size</Label>
                <p className="text-sm text-muted-foreground">Adjust text size for better readability</p>
                <div className="grid grid-cols-3 gap-3">
                  {(["small", "medium", "large"] as FontSize[]).map((size) => (
                    <Button
                      key={size}
                      variant={appearance.font_size === size ? "default" : "outline"}
                      onClick={() => setAppearance({ ...appearance, font_size: size })}
                      className={`capitalize h-16 ${
                        appearance.font_size === size 
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" 
                          : ""
                      }`}
                    >
                      <span className={size === "small" ? "text-xs" : size === "large" ? "text-lg" : "text-sm"}>
                        {size}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveAppearance} disabled={isSaving} className="h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Preferences"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

        {/* Quick Actions */}
        <div className="mt-8">
          <Card className="border-2 border-red-100">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions that affect your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-red-900">Sign Out</h3>
                  <p className="text-sm text-red-700 mt-1">
                    End your current session and return to login
                  </p>
                </div>
                <Button variant="outline" onClick={handleSignOut} className="gap-2 border-red-200 text-red-600 hover:bg-red-50">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
