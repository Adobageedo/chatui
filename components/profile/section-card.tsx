"use client";

import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SectionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function SectionCard({ icon: Icon, title, description, children }: SectionCardProps) {
  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="border-b bg-muted/40">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
            <Icon className="size-5 text-white" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">{children}</CardContent>
    </Card>
  );
}
