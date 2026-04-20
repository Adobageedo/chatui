"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useAssistantTool } from "@assistant-ui/react";
import { z } from "zod";
import { EmailInteractable } from "./email-interactable";
import { DocumentInteractable } from "./document-interactable";
import { Button } from "@/components/ui/button";
import { MailIcon, FileTextIcon, XIcon, MinimizeIcon, MaximizeIcon } from "lucide-react";

type InteractableItem = {
  id: string;
  type: "email" | "document";
  isMinimized: boolean;
};

// Create a module-level store for items state so it can be accessed in render
let itemsStore: InteractableItem[] = [];
let itemsListeners: Array<() => void> = [];

const setItemsStore = (items: InteractableItem[]) => {
  itemsStore = items;
  itemsListeners.forEach(listener => listener());
};

const useItemsStore = () => {
  const [, forceUpdate] = useState({});
  
  useEffect(() => {
    const listener = () => forceUpdate({});
    itemsListeners.push(listener);
    return () => {
      itemsListeners = itemsListeners.filter(l => l !== listener);
    };
  }, []);
  
  return itemsStore;
};

// Render components that react to state changes
const EmailToolRender = ({ emailId, action }: { emailId: string; action: string }) => {
  const items = useItemsStore();
  const emailItem = items.find(item => item.id === emailId);
  const isMinimized = emailItem?.isMinimized ?? true;
  
  const handleToggle = () => {
    setItemsStore(
      itemsStore.map(item =>
        item.id === emailId ? { ...item, isMinimized: !item.isMinimized } : item
      )
    );
  };
  
  return (
    <div className="rounded-lg border bg-card p-3 text-card-foreground shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <MailIcon className="size-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">
              Email {action === "create" ? "créé" : action === "remove" ? "supprimé" : "cleared"}
            </h3>
            <p className="text-xs text-muted-foreground">ID: {emailId}</p>
          </div>
        </div>
        {emailItem && (
          <Button
            variant={isMinimized ? "default" : "outline"}
            size="sm"
            onClick={handleToggle}
            className="h-8"
          >
            {isMinimized ? (
              <>
                <MaximizeIcon className="mr-1.5 size-3.5" />
                Ouvrir
              </>
            ) : (
              <>
                <MinimizeIcon className="mr-1.5 size-3.5" />
                Fermer
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

const DocumentToolRender = ({ documentId, action }: { documentId: string; action: string }) => {
  const items = useItemsStore();
  const docItem = items.find(item => item.id === documentId);
  const isMinimized = docItem?.isMinimized ?? true;
  
  const handleToggle = () => {
    setItemsStore(
      itemsStore.map(item =>
        item.id === documentId ? { ...item, isMinimized: !item.isMinimized } : item
      )
    );
  };
  
  return (
    <div className="rounded-lg border bg-card p-3 text-card-foreground shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
            <FileTextIcon className="size-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">
              Document {action === "create" ? "créé" : action === "remove" ? "supprimé" : "cleared"}
            </h3>
            <p className="text-xs text-muted-foreground">ID: {documentId}</p>
          </div>
        </div>
        {docItem && (
          <Button
            variant={isMinimized ? "default" : "outline"}
            size="sm"
            onClick={handleToggle}
            className="h-8"
          >
            {isMinimized ? (
              <>
                <MaximizeIcon className="mr-1.5 size-3.5" />
                Ouvrir
              </>
            ) : (
              <>
                <MinimizeIcon className="mr-1.5 size-3.5" />
                Fermer
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export function InteractablesManager() {
  const [items, setItems] = useState<InteractableItem[]>([]);
  
  // Sync local state with global store
  useEffect(() => {
    setItemsStore(items);
  }, [items]);

  // Email management tool
  useAssistantTool({
    toolName: "manage_emails",
    description:
      'Manage email drafts. Actions: "create" (creates a new draft, returns its id), "remove" (requires emailId), "clear" (removes all drafts). After creating, use the update_email_{id} tool to set its content.',
    parameters: z.object({
      action: z.enum(["create", "remove", "clear"]),
      emailId: z.string().optional(),
    }),
    execute: async (args) => {
      switch (args.action) {
        case "create": {
          const id = `email-${Date.now().toString(36)}`;
          setItems((prev) => [...prev, { id, type: "email", isMinimized: false }]);
          return { success: true, emailId: id, action: args.action };
        }
        case "remove": {
          if (args.emailId) {
            setItems((prev) => prev.filter((item) => item.id !== args.emailId));
          }
          return { success: true, action: args.action };
        }
        case "clear": {
          setItems((prev) => prev.filter((item) => item.type !== "email"));
          return { success: true, action: args.action };
        }
        default:
          return { success: false, error: "Unknown action" };
      }
    },
    render: ({ args, result }) => {
      if (!result || !result.success || !result.emailId) return null;
      return <EmailToolRender emailId={result.emailId as string} action={args.action as string} />;
    },
  });

  // Document management tool
  useAssistantTool({
    toolName: "manage_documents",
    description:
      'Manage document drafts. Actions: "create" (creates a new document, returns its id), "remove" (requires documentId), "clear" (removes all documents). After creating, use the update_document_{id} tool to set its content.',
    parameters: z.object({
      action: z.enum(["create", "remove", "clear"]),
      documentId: z.string().optional(),
    }),
    execute: async (args) => {
      switch (args.action) {
        case "create": {
          const id = `document-${Date.now().toString(36)}`;
          setItems((prev) => [...prev, { id, type: "document", isMinimized: false }]);
          return { success: true, documentId: id, action: args.action };
        }
        case "remove": {
          if (args.documentId) {
            setItems((prev) => prev.filter((item) => item.id !== args.documentId));
          }
          return { success: true, action: args.action };
        }
        case "clear": {
          setItems((prev) => prev.filter((item) => item.type !== "document"));
          return { success: true, action: args.action };
        }
        default:
          return { success: false, error: "Unknown action" };
      }
    },
    render: ({ args, result }) => {
      if (!result || !result.success || !result.documentId) return null;
      return <DocumentToolRender documentId={result.documentId as string} action={args.action as string} />;
    },
  });

  const handleClose = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleToggleMinimize = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isMinimized: !item.isMinimized } : item
      )
    );
  }, []);

  const handleFocus = useCallback((id: string) => {
    // Move item to end (top z-index)
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (!item) return prev;
      return [...prev.filter((i) => i.id !== id), item];
    });
  }, []);

  if (items.length === 0) return null;

  return (
    <>
      {/* Minimized items bar (bottom left) */}
      {items.some((item) => item.isMinimized) && (
        <div className="fixed bottom-4 left-4 z-40 flex flex-wrap gap-2">
          {items
            .filter((item) => item.isMinimized)
            .map((item) => (
              <Button
                key={item.id}
                variant="secondary"
                size="sm"
                onClick={() => handleToggleMinimize(item.id)}
                className="h-9 shadow-lg"
              >
                {item.type === "email" ? (
                  <MailIcon className="mr-1.5 size-4" />
                ) : (
                  <FileTextIcon className="mr-1.5 size-4" />
                )}
                {item.type === "email" ? "Email" : "Document"}
                <MaximizeIcon className="ml-1.5 size-3" />
              </Button>
            ))}
        </div>
      )}

      {/* Right sidebar - takes half the screen */}
      {items.filter((item) => !item.isMinimized).length > 0 && (
        <div className="fixed right-0 top-0 z-30 flex h-screen w-1/2 flex-col border-l bg-background shadow-xl">
          {/* Tabs for multiple items */}
          {items.filter(i => !i.isMinimized).length > 1 && (
            <div className="flex items-center gap-1 border-b bg-muted/30 px-2 py-1.5">
              {items.filter(i => !i.isMinimized).map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => handleFocus(item.id)}
                  className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm transition-colors ${
                    index === items.filter(i => !i.isMinimized).length - 1
                      ? "bg-background font-medium"
                      : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {item.type === "email" ? (
                    <MailIcon className="size-3.5" />
                  ) : (
                    <FileTextIcon className="size-3.5" />
                  )}
                  {item.type === "email" ? "Email" : "Document"}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleMinimize(item.id);
                    }}
                    className="ml-1 text-muted-foreground hover:text-foreground"
                  >
                    <MinimizeIcon className="size-3" />
                  </button>
                </button>
              ))}
            </div>
          )}

          {/* Active interactable */}
          {items.filter(i => !i.isMinimized).length > 0 && (
            <div className="flex-1 overflow-hidden">
              {(() => {
                const activeItem = items.filter(i => !i.isMinimized)[items.filter(i => !i.isMinimized).length - 1];
                return activeItem.type === "email" ? (
                  <EmailInteractable emailId={activeItem.id} onClose={() => handleClose(activeItem.id)} />
                ) : (
                  <DocumentInteractable documentId={activeItem.id} onClose={() => handleClose(activeItem.id)} />
                );
              })()}
            </div>
          )}
        </div>
      )}
    </>
  );
}
