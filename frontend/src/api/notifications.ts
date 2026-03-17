import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "./client";

export interface Notification {
  id: string;
  title: string;
  body: string;
  notification_type: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export function useNotifications() {
  return useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await apiClient.get("/core/notifications/");
      return data.results ?? data;
    },
    refetchInterval: 30_000, // poll every 30 s
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/core/notifications/${id}/mark-read/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post("/core/notifications/mark-all-read/"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
