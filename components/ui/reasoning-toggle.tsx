"use client";

import { BrainCircuitIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { useReasoning } from "@/contexts/reasoning-context";

export function ReasoningToggle() {
  const { reasoningEnabled, setReasoningEnabled } = useReasoning();

  return (
    <TooltipIconButton
      tooltip={reasoningEnabled ? "Disable reasoning mode" : "Enable reasoning mode"}
      side="top"
      type="button"
      variant={reasoningEnabled ? "default" : "ghost"}
      size="icon"
      className={cn(
        "size-8 rounded-full transition-colors",
        reasoningEnabled && "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
      )}
      onClick={() => setReasoningEnabled(!reasoningEnabled)}
      aria-label={reasoningEnabled ? "Disable reasoning mode" : "Enable reasoning mode"}
    >
      <BrainCircuitIcon className="size-4" />
    </TooltipIconButton>
  );
}
