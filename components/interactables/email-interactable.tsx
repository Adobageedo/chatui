"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAssistantInteractable, useInteractableState } from "@assistant-ui/react";
import { z } from "zod";
import {
  MailIcon,
  CopyIcon,
  CheckIcon,
  Trash2Icon,
  XIcon,
  UserIcon,
  AtSignIcon,
  AlignLeftIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { storageService, type EmailData } from "@/lib/interactables/storage-service";

const emailSchema = z.object({
  to: z.string(),
  subject: z.string(),
  body: z.string(),
  cc: z.string().optional(),
  bcc: z.string().optional(),
});

type EmailState = z.infer<typeof emailSchema>;

const initialState: EmailState = {
  to: "",
  subject: "",
  body: "",
  cc: "",
  bcc: "",
};

export function EmailInteractable({ emailId, onClose }: { emailId: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const hasLoadedRef = useRef(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const id = useAssistantInteractable(emailId, {
    description: "Email draft editor",
    stateSchema: emailSchema,
    initialState,
  });

  const [state, { setState, isPending }] = useInteractableState<EmailState>(
    id,
    initialState,
  );

  // Load from storage ONCE on mount
  useEffect(() => {
    if (!hasLoadedRef.current) {
      const saved = storageService.getEmail(emailId);
      if (saved) {
        setState({
          to: saved.to,
          subject: saved.subject,
          body: saved.body,
          cc: saved.cc || "",
          bcc: saved.bcc || "",
        });
        setShowCc(!!saved.cc);
        setShowBcc(!!saved.bcc);
      }
      hasLoadedRef.current = true;
    }
  }, [emailId]);

  // Auto-save with debounce
  useEffect(() => {
    if (!hasLoadedRef.current) return;

    const timeout = setTimeout(() => {
      const emailData: EmailData = {
        id: emailId,
        to: state.to,
        subject: state.subject,
        body: state.body,
        cc: state.cc,
        bcc: state.bcc,
        createdAt: storageService.getEmail(emailId)?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      storageService.saveEmail(emailData);
      setIsSaved(true);
    }, 500);

    setIsSaved(false);
    return () => clearTimeout(timeout);
  }, [state, emailId]);

  const handleCopy = useCallback(() => {
    const text = storageService.exportEmail(emailId);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [emailId]);

  const handleDelete = useCallback(() => {
    if (confirm("Supprimer cet email ?")) {
      storageService.deleteEmail(emailId);
      onClose();
    }
  }, [emailId, onClose]);

  const handleFieldChange = (field: keyof EmailState, value: string) => {
    // For body field, preserve cursor position
    if (field === "body" && bodyRef.current) {
      const cursorPos = bodyRef.current.selectionStart;
      setState({ ...state, [field]: value });
      setTimeout(() => {
        if (bodyRef.current) {
          bodyRef.current.selectionStart = cursorPos;
          bodyRef.current.selectionEnd = cursorPos;
        }
      }, 0);
    } else {
      setState({ ...state, [field]: value });
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <MailIcon className="size-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Email</h3>
            <p className="text-xs text-muted-foreground">
              {isSaved ? "Enregistré" : "Enregistrement..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="size-8"
            title="Copier"
          >
            {copied ? (
              <CheckIcon className="size-4 text-green-600" />
            ) : (
              <CopyIcon className="size-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            className="size-8 text-destructive hover:text-destructive"
            title="Supprimer"
          >
            <Trash2Icon className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-8"
            title="Fermer"
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      </div>

      {/* Email Form */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {/* To */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <UserIcon className="size-3.5" />
              Destinataire
            </label>
            <input
              type="email"
              value={state.to}
              onChange={(e) => handleFieldChange("to", e.target.value)}
              placeholder="destinataire@example.com"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Cc/Bcc Toggle */}
          {!showCc && !showBcc && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowCc(true)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                + Cc
              </button>
              <button
                onClick={() => setShowBcc(true)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                + Cci
              </button>
            </div>
          )}

          {/* Cc */}
          {showCc && (
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <AtSignIcon className="size-3.5" />
                Cc
                <button
                  onClick={() => {
                    setShowCc(false);
                    handleFieldChange("cc", "");
                  }}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="size-3" />
                </button>
              </label>
              <input
                type="email"
                value={state.cc || ""}
                onChange={(e) => handleFieldChange("cc", e.target.value)}
                placeholder="cc@example.com"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          {/* Bcc */}
          {showBcc && (
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <AtSignIcon className="size-3.5" />
                Cci
                <button
                  onClick={() => {
                    setShowBcc(false);
                    handleFieldChange("bcc", "");
                  }}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="size-3" />
                </button>
              </label>
              <input
                type="email"
                value={state.bcc || ""}
                onChange={(e) => handleFieldChange("bcc", e.target.value)}
                placeholder="cci@example.com"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          {/* Subject */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <AlignLeftIcon className="size-3.5" />
              Objet
            </label>
            <input
              type="text"
              value={state.subject}
              onChange={(e) => handleFieldChange("subject", e.target.value)}
              placeholder="Objet de l'email"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Body */}
          <div className="space-y-1">
            <label className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Message</span>
              <span className="text-xs text-muted-foreground/60">
                {state.body.length} caractères
              </span>
            </label>
            <textarea
              ref={bodyRef}
              value={state.body}
              onChange={(e) => handleFieldChange("body", e.target.value)}
              placeholder="Écrivez votre message ici..."
              rows={12}
              className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleFieldChange("body", state.body + "\n\nCordialement,\n[Votre nom]")
              }
              className="h-7 text-xs"
            >
              + Signature
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleFieldChange("body", "Bonjour,\n\n" + state.body)
              }
              className="h-7 text-xs"
            >
              + Salutation
            </Button>
          </div>
        </div>
      </div>

      {/* Footer stats */}
      <div className="border-t bg-muted/30 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Mots: {state.body.split(/\s+/).filter(Boolean).length}</span>
          <span>Dernière modification: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}
