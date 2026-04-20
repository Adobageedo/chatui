"use client";

import { OutlookRuntimeProvider } from "./OutlookRuntimeProvider";
import { Thread } from "@/components/assistant-ui/thread";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThreadListSidebar } from "@/components/assistant-ui/threadlist-sidebar";
import { Navbar } from "@/layout/navbar";
import { InteractablesManager } from "@/components/interactables/interactables-manager";
import { useOutlookContext } from "@/hooks/use-outlook-context";
import { useEffect, useState } from "react";

function OutlookContextBanner() {
  const { context, isOutlookMode, getEmailSummary } = useOutlookContext();
  const [showBanner, setShowBanner] = useState(true);

  if (!isOutlookMode || !context || !context.subject) {
    return null;
  }

  if (!showBanner) {
    return (
      <div className="bg-blue-50 border-b border-blue-100 px-4 py-1">
        <button
          onClick={() => setShowBanner(true)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Show email context
        </button>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
              Outlook Context
            </span>
            <button
              onClick={() => setShowBanner(false)}
              className="text-blue-400 hover:text-blue-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="text-sm text-gray-700 space-y-1">
            {context.subject && (
              <div>
                <span className="font-medium">Subject:</span> {context.subject}
              </div>
            )}
            {context.from && (
              <div>
                <span className="font-medium">From:</span> {context.from}
              </div>
            )}
            {context.to && context.to.length > 0 && (
              <div>
                <span className="font-medium">To:</span> {context.to.join(", ")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const OutlookAssistant = () => {
  return (
    <OutlookRuntimeProvider>
      <SidebarProvider>
        <div className="flex h-dvh w-full pr-0.5">
          <ThreadListSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger />
              <Navbar hideLogo={true} />
            </header>
            <OutlookContextBanner />
            <div className="flex-1 overflow-hidden">
              <Thread />
            </div>
          </SidebarInset>
        </div>
        
        <InteractablesManager />
      </SidebarProvider>
    </OutlookRuntimeProvider>
  );
};
