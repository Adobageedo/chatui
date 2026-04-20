"use client";

import React from "react";
import { z } from "zod";
import type { Toolkit } from "@assistant-ui/react";

declare global {
  interface Window {
    Office: any;
  }
}

function ToolResultCard({ title, success, message }: { title: string; success: boolean; message: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className={`h-2 w-2 rounded-full ${success ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="text-sm">{message}</div>
    </div>
  );
}

function ConfirmableChange({ 
  title, 
  oldValue, 
  newValue, 
  onConfirm, 
  type 
}: { 
  title: string; 
  oldValue: string; 
  newValue: string; 
  onConfirm: () => Promise<void>;
  type: 'subject' | 'body';
}) {
  const [isApplying, setIsApplying] = React.useState(false);
  const [applied, setApplied] = React.useState(false);

  const handleConfirm = async () => {
    setIsApplying(true);
    try {
      await onConfirm();
      setApplied(true);
    } catch (error) {
      console.error('Failed to apply change:', error);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-2 w-2 rounded-full bg-blue-500"></div>
        <h3 className="font-semibold">{title}</h3>
      </div>
      
      <div className="space-y-3">
        {/* Ancien texte barré */}
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Actuel :</span>
          <div className={`p-2 rounded bg-red-50 border border-red-200 ${type === 'body' ? 'max-h-32 overflow-auto' : ''}`}>
            <p className="line-through text-red-700 text-sm">{oldValue || '(vide)'}</p>
          </div>
        </div>

        {/* Nouveau texte */}
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Proposé :</span>
          <div className={`p-2 rounded bg-green-50 border border-green-200 ${type === 'body' ? 'max-h-32 overflow-auto' : ''}`}>
            <p className="text-green-700 text-sm whitespace-pre-wrap">{newValue}</p>
          </div>
        </div>

        {/* Bouton de confirmation */}
        {!applied ? (
          <button
            onClick={handleConfirm}
            disabled={isApplying}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {isApplying ? 'Application...' : 'Remplacer'}
          </button>
        ) : (
          <div className="w-full px-4 py-2 bg-green-600 text-white rounded-md text-center text-sm font-medium">
            ✓ Appliqué avec succès
          </div>
        )}
      </div>
    </div>
  );
}

export const outlookTools: Toolkit = {
  suggestSubjectChange: {
    description: "Suggest a new subject for the email with a confirmation UI showing old (strikethrough) and new subject",
    parameters: z.object({
      newSubject: z.string().describe("The new subject to propose"),
      oldSubject: z.string().optional().describe("The current subject (optional, will be fetched if not provided)"),
    }),
    execute: async ({ newSubject, oldSubject }) => {
      if (typeof window === "undefined" || !window.Office || !window.Office.context) {
        return { 
          success: false, 
          oldSubject: oldSubject || '',
          newSubject,
          message: "Not running in Outlook environment" 
        };
      }

      const item = window.Office.context.mailbox?.item;
      if (!item) {
        return { 
          success: false,
          oldSubject: oldSubject || '',
          newSubject,
          message: "No email item is currently open" 
        };
      }

      // Get current subject if not provided
      let currentSubject = oldSubject || '';
      if (!currentSubject && typeof item.subject === 'string') {
        currentSubject = item.subject;
      } else if (!currentSubject && item.subject && typeof item.subject.getAsync === 'function') {
        await new Promise((resolve) => {
          item.subject.getAsync((result: any) => {
            if (result.status === window.Office.AsyncResultStatus.Succeeded) {
              currentSubject = result.value;
            }
            resolve(undefined);
          });
        });
      }

      return {
        success: true,
        oldSubject: currentSubject,
        newSubject,
        message: "Waiting for confirmation",
      };
    },
    render: ({ result }) => {
      if (!result) return <div>Préparation de la suggestion...</div>;
      
      if (!result.success) {
        return <ToolResultCard title="Modifier le sujet" success={false} message={result.message} />;
      }

      const handleConfirm = async () => {
        if (typeof window === "undefined" || !window.Office) return;
        const item = window.Office.context.mailbox?.item;
        if (!item || !item.subject || typeof item.subject.setAsync !== 'function') {
          throw new Error("Cannot set subject");
        }
        
        return new Promise<void>((resolve, reject) => {
          item.subject.setAsync(result.newSubject, (apiResult: any) => {
            if (apiResult.status === window.Office.AsyncResultStatus.Succeeded) {
              resolve();
            } else {
              reject(new Error(apiResult.error?.message || 'Failed'));
            }
          });
        });
      };

      return (
        <ConfirmableChange
          title="Modifier le sujet"
          oldValue={result.oldSubject}
          newValue={result.newSubject}
          onConfirm={handleConfirm}
          type="subject"
        />
      );
    },
  },

  suggestBodyChange: {
    description: "Suggest a new body for the email with a confirmation UI showing old (strikethrough) and new body",
    parameters: z.object({
      newBody: z.string().describe("The new body content to propose"),
      oldBody: z.string().optional().describe("The current body (optional, will be fetched if not provided)"),
      bodyType: z.enum(["text", "html"]).optional().describe("The format of the body content. Defaults to text."),
    }),
    execute: async ({ newBody, oldBody, bodyType = "text" }) => {
      if (typeof window === "undefined" || !window.Office || !window.Office.context) {
        return { 
          success: false,
          oldBody: oldBody || '',
          newBody,
          bodyType,
          message: "Not running in Outlook environment" 
        };
      }

      const item = window.Office.context.mailbox?.item;
      if (!item) {
        return { 
          success: false,
          oldBody: oldBody || '',
          newBody,
          bodyType,
          message: "No email item is currently open" 
        };
      }

      // Get current body if not provided
      let currentBody = oldBody || '';
      if (!currentBody && item.body && typeof item.body.getAsync === 'function') {
        await new Promise((resolve) => {
          item.body.getAsync('text', (result: any) => {
            if (result.status === window.Office.AsyncResultStatus.Succeeded) {
              currentBody = result.value;
            }
            resolve(undefined);
          });
        });
      }

      return {
        success: true,
        oldBody: currentBody,
        newBody,
        bodyType,
        message: "Waiting for confirmation",
      };
    },
    render: ({ result }) => {
      if (!result) return <div>Préparation de la suggestion...</div>;
      
      if (!result.success) {
        return <ToolResultCard title="Modifier le corps" success={false} message={result.message} />;
      }

      const handleConfirm = async () => {
        if (typeof window === "undefined" || !window.Office) return;
        const item = window.Office.context.mailbox?.item;
        if (!item) throw new Error("No email item");
        
        const coercionType = result.bodyType === "html" 
          ? window.Office.CoercionType.Html 
          : window.Office.CoercionType.Text;

        return new Promise<void>((resolve, reject) => {
          item.body.setAsync(result.newBody, { coercionType }, (apiResult: any) => {
            if (apiResult.status === window.Office.AsyncResultStatus.Succeeded) {
              resolve();
            } else {
              reject(new Error(apiResult.error?.message || 'Failed'));
            }
          });
        });
      };

      return (
        <ConfirmableChange
          title="Modifier le corps de l'email"
          oldValue={result.oldBody}
          newValue={result.newBody}
          onConfirm={handleConfirm}
          type="body"
        />
      );
    },
  },

  insertEmailText: {
    description: "Insert text into the current email body at the cursor position in Outlook",
    parameters: z.object({
      text: z.string().describe("The text to insert into the email"),
    }),
    execute: async ({ text }) => {
      if (typeof window === "undefined" || !window.Office || !window.Office.context) {
        return { 
          success: false, 
          message: "Not running in Outlook environment" 
        };
      }

      const item = window.Office.context.mailbox?.item;
      if (!item) {
        return { 
          success: false, 
          message: "No email item is currently open" 
        };
      }

      return new Promise((resolve) => {
        item.body.setSelectedDataAsync(
          text,
          { coercionType: window.Office.CoercionType.Text },
          (result: any) => {
            if (result.status === window.Office.AsyncResultStatus.Succeeded) {
              resolve({ success: true, message: "Text inserted successfully" });
            } else {
              resolve({ 
                success: false, 
                message: `Failed to insert text: ${result.error?.message || "Unknown error"}` 
              });
            }
          }
        );
      });
    },
    render: ({ result }) => {
      if (!result) return <div>Inserting text...</div>;
      return <ToolResultCard title="Insert Email Text" success={result.success} message={result.message} />;
    },
  },

  setEmailSubject: {
    description: "Set or update the subject line of the current email in Outlook",
    parameters: z.object({
      subject: z.string().describe("The subject line to set"),
    }),
    execute: async ({ subject }) => {
      if (typeof window === "undefined" || !window.Office || !window.Office.context) {
        return { 
          success: false, 
          message: "Not running in Outlook environment" 
        };
      }

      const item = window.Office.context.mailbox?.item;
      if (!item) {
        return { 
          success: false, 
          message: "No email item is currently open" 
        };
      }

      if (!item.subject || typeof item.subject.setAsync !== "function") {
        return { 
          success: false, 
          message: "Cannot set subject on this email (read-only or not supported)" 
        };
      }

      return new Promise((resolve) => {
        item.subject.setAsync(
          subject,
          (result: any) => {
            if (result.status === window.Office.AsyncResultStatus.Succeeded) {
              resolve({ success: true, message: "Subject set successfully" });
            } else {
              resolve({ 
                success: false, 
                message: `Failed to set subject: ${result.error?.message || "Unknown error"}` 
              });
            }
          }
        );
      });
    },
    render: ({ result }) => {
      if (!result) return <div>Setting subject...</div>;
      return <ToolResultCard title="Set Email Subject" success={result.success} message={result.message} />;
    },
  },

  replaceEmailBody: {
    description: "Replace the entire body of the current email in Outlook",
    parameters: z.object({
      body: z.string().describe("The new body content for the email"),
      bodyType: z.enum(["text", "html"]).optional().describe("The format of the body content (text or html). Defaults to text."),
    }),
    execute: async ({ body, bodyType = "text" }) => {
      if (typeof window === "undefined" || !window.Office || !window.Office.context) {
        return { 
          success: false, 
          message: "Not running in Outlook environment" 
        };
      }

      const item = window.Office.context.mailbox?.item;
      if (!item) {
        return { 
          success: false, 
          message: "No email item is currently open" 
        };
      }

      const coercionType = bodyType === "html" 
        ? window.Office.CoercionType.Html 
        : window.Office.CoercionType.Text;

      return new Promise((resolve) => {
        item.body.setAsync(
          body,
          { coercionType },
          (result: any) => {
            if (result.status === window.Office.AsyncResultStatus.Succeeded) {
              resolve({ success: true, message: "Email body replaced successfully" });
            } else {
              resolve({ 
                success: false, 
                message: `Failed to replace body: ${result.error?.message || "Unknown error"}` 
              });
            }
          }
        );
      });
    },
    render: ({ result }) => {
      if (!result) return <div>Replacing email body...</div>;
      return <ToolResultCard title="Replace Email Body" success={result.success} message={result.message} />;
    },
  },

  addEmailRecipient: {
    description: "Add a recipient to the To, CC, or BCC field of the current email in Outlook",
    parameters: z.object({
      email: z.string().describe("The email address to add"),
      name: z.string().optional().describe("The display name for the recipient"),
      field: z.enum(["to", "cc", "bcc"]).describe("Which field to add the recipient to (to, cc, or bcc)"),
    }),
    execute: async ({ email, name, field }) => {
      if (typeof window === "undefined" || !window.Office || !window.Office.context) {
        return { 
          success: false, 
          message: "Not running in Outlook environment" 
        };
      }

      const item = window.Office.context.mailbox?.item;
      if (!item) {
        return { 
          success: false, 
          message: "No email item is currently open" 
        };
      }

      const recipientField = field === "to" ? item.to : field === "cc" ? item.cc : item.bcc;
      
      if (!recipientField || typeof recipientField.addAsync !== "function") {
        return { 
          success: false, 
          message: `Cannot add recipient to ${field} field (read-only or not supported)` 
        };
      }

      const recipients = name ? [{ emailAddress: email, displayName: name }] : [email];

      return new Promise((resolve) => {
        recipientField.addAsync(
          recipients,
          (result: any) => {
            if (result.status === window.Office.AsyncResultStatus.Succeeded) {
              resolve({ success: true, message: `Recipient added to ${field} successfully` });
            } else {
              resolve({ 
                success: false, 
                message: `Failed to add recipient: ${result.error?.message || "Unknown error"}` 
              });
            }
          }
        );
      });
    },
    render: ({ result }) => {
      if (!result) return <div>Adding recipient...</div>;
      return <ToolResultCard title="Add Email Recipient" success={result.success} message={result.message} />;
    },
  },

  getEmailDetails: {
    description: "Get full details of the current email in Outlook (subject, from, to, cc, body)",
    parameters: z.object({}),
    execute: async () => {
      if (typeof window === "undefined" || !window.Office || !window.Office.context) {
        return { 
          success: false, 
          message: "Not running in Outlook environment",
          details: null
        };
      }

      const item = window.Office.context.mailbox?.item;
      if (!item) {
        return { 
          success: false, 
          message: "No email item is currently open",
          details: null
        };
      }

      const details: any = {
        itemType: item.itemType,
        subject: "",
        from: "",
        to: [],
        cc: [],
        body: "",
      };

      return new Promise((resolve) => {
        const resolveDetails = () => {
          resolve({ success: true, message: "Email details retrieved successfully", details });
        };

        if (item.from) {
          details.from = item.from.emailAddress || item.from.displayName || "";
        }

        if (item.to) {
          details.to = item.to.map((r: any) => r.emailAddress || r.displayName || "");
        }

        if (item.cc) {
          details.cc = item.cc.map((r: any) => r.emailAddress || r.displayName || "");
        }

        if (typeof item.subject === "string") {
          details.subject = item.subject;
          
          if (item.body && typeof item.body.getAsync === "function") {
            item.body.getAsync("text", (result: any) => {
              if (result.status === window.Office.AsyncResultStatus.Succeeded) {
                details.body = result.value;
              }
              resolveDetails();
            });
          } else {
            resolveDetails();
          }
        } else if (item.subject && typeof item.subject.getAsync === "function") {
          item.subject.getAsync((subjectResult: any) => {
            if (subjectResult.status === window.Office.AsyncResultStatus.Succeeded) {
              details.subject = subjectResult.value;
            }
            
            if (item.body && typeof item.body.getAsync === "function") {
              item.body.getAsync("text", (bodyResult: any) => {
                if (bodyResult.status === window.Office.AsyncResultStatus.Succeeded) {
                  details.body = bodyResult.value;
                }
                resolveDetails();
              });
            } else {
              resolveDetails();
            }
          });
        } else {
          resolveDetails();
        }
      });
    },
    render: ({ result }) => {
      if (!result) return <div>Getting email details...</div>;
      
      if (!result.success || !result.details) {
        return <ToolResultCard title="Get Email Details" success={false} message={result.message} />;
      }

      return (
        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
            <h3 className="font-semibold">Email Details</h3>
          </div>
          <div className="space-y-2 text-sm">
            {result.details.subject && (
              <div>
                <span className="font-medium">Subject:</span> {result.details.subject}
              </div>
            )}
            {result.details.from && (
              <div>
                <span className="font-medium">From:</span> {result.details.from}
              </div>
            )}
            {result.details.to && result.details.to.length > 0 && (
              <div>
                <span className="font-medium">To:</span> {result.details.to.join(", ")}
              </div>
            )}
            {result.details.cc && result.details.cc.length > 0 && (
              <div>
                <span className="font-medium">CC:</span> {result.details.cc.join(", ")}
              </div>
            )}
            {result.details.body && (
              <div>
                <span className="font-medium">Body:</span>
                <pre className="mt-1 whitespace-pre-wrap text-xs bg-muted p-2 rounded max-h-40 overflow-auto">
                  {result.details.body}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    },
  },
};
