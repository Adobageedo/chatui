"use client";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  X,
  Minimize2,
  Maximize2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Move,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { type UploadItem } from "@/hooks/files/use-upload-progress";

type UploadProgressModalProps = {
  items: UploadItem[];
  onClose: () => void;
};

export function UploadProgressModal({ items, onClose }: UploadProgressModalProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (items.length === 0) return null;

  const uploading = items.filter((i) => i.status === "uploading").length;
  const completed = items.filter((i) => i.status === "complete").length;
  const errors = items.filter((i) => i.status === "error").length;
  const total = items.length;
  const allDone = uploading === 0;

  const uploadingMoves = items.filter((i) => i.status === "uploading" && i.type === "move").length;
  const uploadingUploads = items.filter((i) => i.status === "uploading" && i.type === "upload").length;
  const hasMoves = items.some((i) => i.type === "move");
  const hasUploads = items.some((i) => i.type === "upload");

  const overallProgress = total > 0 ? ((completed + errors) / total) * 100 : 0;

  return (
    <Card className="fixed bottom-4 right-4 w-96 shadow-lg border bg-background z-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          {uploading > 0 ? (
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
          ) : errors > 0 ? (
            <AlertCircle className="h-4 w-4 text-destructive" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          )}
          <span className="font-medium text-sm">
            {uploading > 0
              ? `${hasMoves && hasUploads ? "Moving & uploading" : hasMoves ? "Moving" : "Uploading"} ${uploading} of ${total}...`
              : errors > 0
              ? `${completed} complete, ${errors} failed`
              : `${completed} complete`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? (
              <Maximize2 className="h-3.5 w-3.5" />
            ) : (
              <Minimize2 className="h-3.5 w-3.5" />
            )}
          </Button>
          {allDone && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Overall Progress */}
      {!isMinimized && (
        <div className="px-4 py-3 border-b">
          <Progress value={overallProgress} className="h-1.5" />
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {completed + errors} of {total} complete
            </span>
            {errors > 0 && (
              <span className="text-destructive">{errors} failed</span>
            )}
          </div>
        </div>
      )}

      {/* Item List */}
      {!isMinimized && (
        <div className="max-h-80 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0"
            >
              {item.status === "uploading" && (
                <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />
              )}
              {item.status === "complete" && (
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
              )}
              {item.status === "error" && (
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
              )}
              {item.type === "move" && (
                <Move className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              )}
              {item.type === "upload" && (
                <Upload className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{item.name}</p>
                {item.status === "error" && item.error && (
                  <p className="text-xs text-destructive truncate">
                    {item.error}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
