"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import {
  MessageSquare,
  User,
  LogOut,
  Settings,
  Sparkles,
  ChevronDown,
} from "lucide-react";

interface NavbarProps {
  hideLogo?: boolean;
}

export const Navbar = ({ hideLogo = false }: NavbarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const navLinks = [
    { href: "/chat", label: "Chat", icon: MessageSquare },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <nav className="flex items-center w-full gap-4">
      {/* Logo & Brand */}
      {!hideLogo && (
        <Link href="/chat" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            ChatAI
          </span>
        </Link>
      )}

      {/* Navigation Links - Desktop */}
      <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link key={link.href} href={link.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                className="gap-2"
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Button>
            </Link>
          );
        })}
      </div>

      {/* User Menu */}
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium">
              {user?.user_metadata?.name || user?.email?.split("@")[0] || "User"}
            </span>
            <span className="text-xs text-muted-foreground">
              {user?.email}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
            {(user?.user_metadata?.name?.[0] || user?.email?.[0] || "U").toUpperCase()}
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
        </button>

        {/* Dropdown Menu */}
        {showUserMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowUserMenu(false)}
            />
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium truncate">
                  {user?.user_metadata?.name || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>

              {/* Mobile Navigation Links */}
              <div className="md:hidden border-b border-gray-100 py-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setShowUserMenu(false)}
                      className={`flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        isActive ? "bg-gray-50 text-blue-600" : ""
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              <Link
                href="/profile"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>

              <button
                onClick={() => {
                  setShowUserMenu(false);
                  handleSignOut();
                }}
                className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors w-full text-left text-red-600"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </nav>
  );
};
