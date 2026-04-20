"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAssistantInteractable, useInteractableState } from "@assistant-ui/react";
import { z } from "zod";
import {
  FileTextIcon,
  DownloadIcon,
  Trash2Icon,
  CopyIcon,
  CheckIcon,
  XIcon,
  EyeIcon,
  EditIcon,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { storageService } from "@/lib/interactables/storage-service";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const documentSchema = z.object({
  title: z.string(),
  content: z.string(),
});

type DocumentState = z.infer<typeof documentSchema>;

const initialState: DocumentState = {
  title: "Nouveau document",
  content: "",
};

export function DocumentInteractable({ 
  documentId, 
  onClose 
}: { 
  documentId: string; 
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const hasLoadedRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const id = useAssistantInteractable(documentId, {
    description: "Document editor with markdown support",
    stateSchema: documentSchema,
    initialState,
  });

  const [state, { setState, isPending }] = useInteractableState<DocumentState>(
    id,
    initialState,
  );

  // Load from storage ONCE on mount
  useEffect(() => {
    if (!hasLoadedRef.current) {
      const saved = storageService.getDocument(documentId);
      if (saved) {
        setState({
          title: saved.title,
          content: saved.content,
        });
      }
      hasLoadedRef.current = true;
    }
  }, [documentId]);

  // Auto-save with debounce
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    
    const timeout = setTimeout(() => {
      storageService.saveDocument({
        id: documentId,
        title: state.title,
        content: state.content,
        type: "other",
        createdAt: storageService.getDocument(documentId)?.createdAt || Date.now(),
        updatedAt: Date.now(),
      });
      setIsSaved(true);
    }, 500);

    setIsSaved(false);
    return () => clearTimeout(timeout);
  }, [state.title, state.content, documentId]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(`# ${state.title}\n\n${state.content}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [state.title, state.content]);

  const handleDownloadTxt = useCallback(() => {
    const text = `# ${state.title}\n\n${state.content}`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.title.replace(/[^a-z0-9]/gi, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.title, state.content]);

  const handleDownloadMd = useCallback(() => {
    const text = `# ${state.title}\n\n${state.content}`;
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.title.replace(/[^a-z0-9]/gi, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.title, state.content]);

  const handleDelete = useCallback(() => {
    if (confirm("Supprimer ce document ?")) {
      storageService.deleteDocument(documentId);
      onClose();
    }
  }, [documentId, onClose]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState({ ...state, title: e.target.value });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const cursorPos = e.target.selectionStart;
    setState({ ...state, content: e.target.value });
    
    // Restore cursor position after state update
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = cursorPos;
        textareaRef.current.selectionEnd = cursorPos;
      }
    }, 0);
  };

  const wordCount = state.content.split(/\s+/).filter(Boolean).length;
  const charCount = state.content.length;

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
            <FileTextIcon className="size-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Document</h3>
            <p className="text-xs text-muted-foreground">
              {isSaved ? "Enregistré" : "Enregistrement..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={isPreviewMode ? "default" : "ghost"}
            size="icon"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className="size-8"
            title={isPreviewMode ? "Mode édition" : "Mode aperçu"}
          >
            {isPreviewMode ? <EditIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </Button>
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
          <div className="relative group">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              title="Télécharger"
            >
              <DownloadIcon className="size-4" />
            </Button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-50">
              <div className="bg-popover border rounded-lg shadow-lg p-1 flex flex-col gap-1 min-w-[120px]">
                <button
                  onClick={handleDownloadTxt}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:bg-accent text-left"
                >
                  <FileDown className="size-3.5" />
                  .txt
                </button>
                <button
                  onClick={handleDownloadMd}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:bg-accent text-left"
                >
                  <FileDown className="size-3.5" />
                  .md
                </button>
              </div>
            </div>
          </div>
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

      {/* Document Editor/Preview */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Title */}
        <div className="px-4 pt-4 pb-2">
          <input
            type="text"
            value={state.title}
            onChange={handleTitleChange}
            placeholder="Titre du document"
            className="w-full bg-transparent px-0 py-2 text-2xl font-bold outline-none border-b-2 border-transparent focus:border-primary"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {isPreviewMode ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {state.content || "*Aucun contenu*"}
              </ReactMarkdown>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={state.content}
              onChange={handleContentChange}
              placeholder="Rédigez votre document ici... (Markdown supporté)"
              className="w-full h-full resize-none bg-transparent outline-none text-sm leading-relaxed font-mono"
            />
          )}
        </div>
      </div>

      {/* Footer stats */}
      <div className="border-t bg-muted/30 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{wordCount} mots • {charCount} caractères</span>
          <span>Dernière modification: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}
