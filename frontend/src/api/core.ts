/**
 * Comments, Attachments, and Evidence API hooks.
 * All endpoints filter by content_type=<app>.<model>&object_id=<uuid>
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

export interface Comment {
  id: string;
  body: string;
  is_internal: boolean;
  created_by: string | null;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: string;
  file: string;
  filename: string;
  file_size: number;
  mime_type: string;
  description: string;
  created_by: string | null;
  created_at: string;
}

const commentKey = (ct: string, objId: string) =>
  ["comments", ct, objId] as const;
const attachmentKey = (ct: string, objId: string) =>
  ["attachments", ct, objId] as const;

// ─── Comments ─────────────────────────────────────────────────────────────────

export function useComments(contentType: string, objectId: string) {
  return useQuery({
    queryKey: commentKey(contentType, objectId),
    queryFn: () =>
      apiClient
        .get("/core/comments/", {
          params: { content_type: contentType, object_id: objectId, page_size: 100 },
        })
        .then((r) => (r.data?.results ?? r.data) as Comment[]),
    enabled: !!contentType && !!objectId,
  });
}

export function useCreateComment(contentType: string, objectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { body: string; is_internal?: boolean }) =>
      apiClient
        .post("/core/comments/", { ...data, content_type: contentType, object_id: objectId })
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: commentKey(contentType, objectId) }),
  });
}

export function useDeleteComment(contentType: string, objectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/core/comments/${id}/`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: commentKey(contentType, objectId) }),
  });
}

// ─── Attachments ──────────────────────────────────────────────────────────────

export function useAttachments(contentType: string, objectId: string) {
  return useQuery({
    queryKey: attachmentKey(contentType, objectId),
    queryFn: () =>
      apiClient
        .get("/core/attachments/", {
          params: { content_type: contentType, object_id: objectId, page_size: 100 },
        })
        .then((r) => (r.data?.results ?? r.data) as Attachment[]),
    enabled: !!contentType && !!objectId,
  });
}

export function useUploadAttachment(contentType: string, objectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, description }: { file: File; description?: string }) => {
      const form = new FormData();
      form.append("file", file);
      form.append("content_type", contentType);
      form.append("object_id", objectId);
      if (description) form.append("description", description);
      return apiClient
        .post("/core/attachments/", form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: attachmentKey(contentType, objectId) }),
  });
}

export function useDeleteAttachment(contentType: string, objectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/core/attachments/${id}/`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: attachmentKey(contentType, objectId) }),
  });
}
