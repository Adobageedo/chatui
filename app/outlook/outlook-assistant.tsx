"use client";

import { useEffect, useState } from "react";
import { Assistant } from "../chat/assistant";
import { Button } from "@/components/ui/button";
import { MessageSquare, Mail, ArrowLeft } from "lucide-react";

interface EmailContext {
  subject?: string;
  from?: string;
  to?: string[];
  body?: string;
  itemType?: string;
}

interface TemplateData {
  subject?: string;
  content: string;
}

export function OutlookAssistant() {
  const [isOutlookMode, setIsOutlookMode] = useState(false);
  const [emailContext, setEmailContext] = useState<EmailContext | null>(null);

  useEffect(() => {
    // Check if we're running in Outlook iframe
    const urlParams = new URLSearchParams(window.location.search);
    const outlookMode = urlParams.get('outlook') === 'true';
    setIsOutlookMode(outlookMode);

    if (outlookMode) {
      // Setup iframe communication
      setupIframeCommunication();
      
      // Notify parent that we're ready
      window.parent.postMessage({
        type: 'OUTLOOK_READY'
      }, '*');

      // Request email context
      window.parent.postMessage({
        type: 'OUTLOOK_GET_EMAIL_CONTEXT'
      }, '*');
    }
  }, []);

  const setupIframeCommunication = () => {
    // Listen for messages from parent (Outlook taskpane)
    window.addEventListener('message', function(event) {
      const { type, data } = event.data;

      switch (type) {
        case 'OUTLOOK_EMAIL_CONTEXT':
        case 'OUTLOOK_EMAIL_CONTEXT_UPDATE':
          console.log('Received email context:', data);
          setEmailContext(data);
          break;
        case 'OUTLOOK_ITEM_CHANGED':
          // Item changed in pinned task pane - request updated context
          console.log('Email item changed, requesting new context...');
          window.parent.postMessage({
            type: 'OUTLOOK_GET_EMAIL_CONTEXT'
          }, '*');
          break;
        case 'NOTIFICATION':
          // Handle notifications from Outlook
          console.log('Outlook notification:', data);
          break;
      }
    });
  };

  const sendToOutlook = (type: string, data: any) => {
    if (isOutlookMode && window.parent) {
      window.parent.postMessage({
        type,
        data
      }, '*');
    }
  };

  const handleInsertTemplate = (content: string) => {
    sendToOutlook('OUTLOOK_INSERT_TEMPLATE', { content });
  };

  const handleNewEmail = (template: TemplateData) => {
    sendToOutlook('OUTLOOK_NEW_EMAIL', {
      to: [],
      subject: template.subject || 'Re: ' + (emailContext?.subject || ''),
      content: template.content
    });
  };

  if (isOutlookMode) {
    return (
      <div className="h-screen flex flex-col">
        {/* Outlook Header */}
        <div className="border-b bg-background/95 backdrop-blur px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <span className="font-semibold">Email Assistant</span>
            </div>
            {emailContext && (
              <div className="text-xs text-muted-foreground">
                {emailContext.subject ? `Re: ${emailContext.subject}` : 'New Email'}
              </div>
            )}
          </div>
        </div>

        {/* Chat Interface with Outlook Actions */}
        <div className="flex-1 relative">
          <Assistant />
        </div>
      </div>
    );
  }

  // Regular web mode - show info page
  return (
    <div className="min-h-screen">
      <div className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">Email Assistant</span>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Outlook Add-in</h2>
          <p className="text-muted-foreground">
            This page is designed to work within the Outlook add-in. 
            Please access it through Outlook to use the email assistant features.
          </p>
        </div>
      </div>
    </div>
  );
}
