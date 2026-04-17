"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SaveButtonProps {
  onClick: () => void;
  isSaving: boolean;
  label?: string;
}

export function SaveButton({ onClick, isSaving, label = "Save Changes" }: SaveButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={isSaving}
      className="h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
    >
      {isSaving ? (
        <>
          <Loader2 className="size-4 mr-2 animate-spin" />
          Saving...
        </>
      ) : (
        label
      )}
    </Button>
  );
}
