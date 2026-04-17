"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { User } from "@supabase/supabase-js";

interface ProfileHeaderProps {
  name: string;
  email: string | undefined;
  avatarUrl: string;
  user: User | null;
}

export function ProfileHeader({ name, email, avatarUrl, user }: ProfileHeaderProps) {
  const initials = (name?.[0] || user?.email?.[0] || "U").toUpperCase();

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 border-b">
      <div className="container max-w-5xl mx-auto px-4 py-10 sm:py-12">
        <div className="flex items-center gap-5">
          <Avatar className="size-20 ring-4 ring-white/30 text-2xl font-bold">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={name || "Avatar"} />}
            <AvatarFallback className="bg-white/20 text-white text-2xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">
                {name || "Your Profile"}
              </h1>
              <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                Member
              </Badge>
            </div>
            <p className="text-blue-100 text-sm mt-1 truncate">{email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
