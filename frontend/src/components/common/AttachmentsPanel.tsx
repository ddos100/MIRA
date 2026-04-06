import { useRef } from "react";
import { Paperclip, Trash2, Download, Upload } from "lucide-react";
import { useAttachments, useUploadAttachment, useDeleteAttachment } from "@/api/core";
import { Button } from "@/components/ui/Button";

interface AttachmentsPanelProps {
  contentType: string;
  objectId: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentsPanel({ contentType, objectId }: AttachmentsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: attachments = [], isLoading } = useAttachments(contentType, objectId);
  const uploadMutation = useUploadAttachment(contentType, objectId);
  const deleteMutation = useDeleteAttachment(contentType, objectId);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMutation.mutate({ file });
    e.target.value = "";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          Attachments {attachments.length > 0 && (
            <span className="text-muted-foreground font-normal">({attachments.length})</span>
          )}
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          isLoading={uploadMutation.isPending}
        >
          <Upload className="h-4 w-4" />
          Upload
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading attachments...</p>
      ) : attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attachments yet.</p>
      ) : (
        <div className="space-y-2">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm"
            >
              <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{a.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(a.file_size)} &middot; {a.mime_type}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={a.file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  onClick={() => deleteMutation.mutate(a.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete attachment"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
