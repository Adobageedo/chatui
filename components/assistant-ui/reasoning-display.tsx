"use client";

import "@assistant-ui/react-markdown/styles/dot.css";

import { FC, useState } from "react";
import { BrainIcon, ChevronDownIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export const ReasoningDisplay: FC<{ text: string; isStreaming?: boolean }> = ({ text, isStreaming = false }) => {
  const [open, setOpen] = useState(true);
  
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-4 w-full rounded-lg border border-border">
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted/50">
        <BrainIcon className={cn("size-4 text-primary", isStreaming && "animate-pulse")} />
        <span className="text-foreground">Reasoning</span>
        <ChevronDownIcon 
          className={cn(
            "ml-auto size-4 transition-transform duration-200",
            open ? "rotate-0" : "-rotate-90"
          )} 
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border">
        <div className="max-h-64 overflow-y-auto px-4 py-3 text-sm text-muted-foreground">
          <MarkdownTextPrimitive
            text={text}
            remarkPlugins={[remarkGfm]}
            className="aui-md"
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
