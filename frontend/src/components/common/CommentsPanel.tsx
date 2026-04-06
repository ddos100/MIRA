import { useState } from "react";
import { Trash2, MessageSquare, Lock } from "lucide-react";
import { useComments, useCreateComment, useDeleteComment } from "@/api/core";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/utils/cn";

interface CommentsPanelProps {
  contentType: string;
  objectId: string;
}

export function CommentsPanel({ contentType, objectId }: CommentsPanelProps) {
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  const { data: comments = [], isLoading } = useComments(contentType, objectId);
  const createMutation = useCreateComment(contentType, objectId);
  const deleteMutation = useDeleteComment(contentType, objectId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    createMutation.mutate(
      { body: body.trim(), is_internal: isInternal },
      { onSuccess: () => { setBody(""); setIsInternal(false); } }
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        Comments {comments.length > 0 && <span className="text-muted-foreground font-normal">({comments.length})</span>}
      </h3>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div
              key={c.id}
              className={cn(
                "rounded-md border p-3 text-sm",
                c.is_internal
                  ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20"
                  : "border-border bg-card"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">
                      {c.created_by_name ?? "Unknown"}
                    </span>
                    {c.is_internal && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                        <Lock className="h-3 w-3" /> Internal
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-foreground whitespace-pre-wrap">{c.body}</p>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(c.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  title="Delete comment"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          placeholder="Add a comment..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="rounded border-input"
            />
            Internal note
          </label>
          <Button
            type="submit"
            size="sm"
            disabled={!body.trim()}
            isLoading={createMutation.isPending}
          >
            Add Comment
          </Button>
        </div>
      </form>
    </div>
  );
}
