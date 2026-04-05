"use client";

import { MyRuntimeProvider } from "../MyRuntimeProvider";
import { Thread } from "@/components/assistant-ui/thread";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThreadListSidebar } from "@/components/assistant-ui/threadlist-sidebar";
import { Navbar } from "@/layout/navbar";

export const Assistant = () => {
  return (
    <MyRuntimeProvider>
      <SidebarProvider>
      <div className="flex h-dvh w-full pr-0.5">
        <ThreadListSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <Navbar hideLogo={true} />
          </header>
          <div className="flex-1 overflow-hidden">
            <Thread />
          </div>
        </SidebarInset>
      </div>
      </SidebarProvider>
    </MyRuntimeProvider>
  );
};
