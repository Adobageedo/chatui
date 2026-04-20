"use client";

import { useEffect, useState } from "react";

export interface OutlookEmailContext {
  itemType: string;
  subject: string;
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  body: string;
}

const EMPTY_CONTEXT: OutlookEmailContext = {
  itemType: "message",
  subject: "",
  from: "",
  to: [],
  cc: [],
  bcc: [],
  body: "",
};

export function useOutlookContext() {
  const [context, setContext] = useState<OutlookEmailContext | null>(null);
  const [isOutlookMode, setIsOutlookMode] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const urlParams = new URLSearchParams(window.location.search);
    const outlookParam = urlParams.get("outlook");
    
    if (outlookParam === "true") {
      setIsOutlookMode(true);
      
      try {
        const storedContext = sessionStorage.getItem("outlook_email_context");
        if (storedContext) {
          const parsedContext = JSON.parse(storedContext);
          setContext(parsedContext);
        } else {
          setContext(EMPTY_CONTEXT);
        }
      } catch (e) {
        console.error("Failed to parse Outlook context:", e);
        setContext(EMPTY_CONTEXT);
      }
    }
  }, []);

  const getEmailSummary = (): string => {
    if (!context || !isOutlookMode) return "";

    const parts: string[] = [];
    
    if (context.subject) {
      parts.push(`Subject: ${context.subject}`);
    }
    
    if (context.from) {
      parts.push(`From: ${context.from}`);
    }
    
    if (context.to && context.to.length > 0) {
      parts.push(`To: ${context.to.join(", ")}`);
    }
    
    if (context.cc && context.cc.length > 0) {
      parts.push(`CC: ${context.cc.join(", ")}`);
    }
    
    if (context.body) {
      parts.push(`\nBody:\n${context.body}`);
    }

    return parts.length > 0 ? parts.join("\n") : "";
  };

  const getSystemPrompt = (): string => {
    if (!isOutlookMode || !context) return "";

    const emailSummary = getEmailSummary();
    if (!emailSummary) {
      return "You are an AI assistant integrated with Outlook. You can help with email composition, analysis, and management.";
    }

    return `You are an AI assistant integrated with Outlook. The user is currently viewing or composing an email with the following context:

${emailSummary}

You can help with:
- Drafting or improving email responses
- Analyzing email content
- Suggesting actions or follow-ups
- Formatting and tone improvements
- Extracting key information from emails`;
  };

  return {
    context,
    isOutlookMode,
    getEmailSummary,
    getSystemPrompt,
  };
}
