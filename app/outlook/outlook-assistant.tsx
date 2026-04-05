"use client";

import { EmailProvider } from "@/contexts/email-context";
import { Assistant } from "../chat/assistant";

export function OutlookAssistant() {
  return (
    <EmailProvider autoLoad={true} forcePlatform="outlook">
      <Assistant />
    </EmailProvider>
  );
}
