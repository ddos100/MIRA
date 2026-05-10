import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActionType = "send_email" | "call_webhook" | "create_notification";

export interface AutomatedAction {
  id: string;
  status_rule: string;
  action_type: ActionType;
  action_type_display: string;
  name: string;
  is_active: boolean;
  config: Record<string, unknown>;
  last_triggered_at: string | null;
  trigger_count: number;
  created_at: string;
  updated_at: string;
}

export interface ContentTypeOption {
  id: number;
  label: string;   // e.g. "risks.risk"
  display: string; // e.g. "Risk"
}

const EP = "/core/automated-actions/";
const CT_EP = "/core/content-types/";

export const automatedActionKeys = {
  all: ["automated-actions"] as const,
  byRule: (ruleId: string) => [...automatedActionKeys.all, "rule", ruleId] as const,
  list: () => [...automatedActionKeys.all, "list"] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAutomatedActions(statusRuleId?: string) {
  return useQuery({
    queryKey: automatedActionKeys.byRule(statusRuleId ?? ""),
    queryFn: async () => {
      const { data } = await apiClient.get<{ results: AutomatedAction[] }>(EP, {
        params: { status_rule: statusRuleId, page_size: 100 },
      });
      return data.results ?? [];
    },
    enabled: !!statusRuleId,
  });
}

/** Fetch all automated actions across all modules (no status_rule filter). */
export function useAllAutomatedActions() {
  return useQuery({
    queryKey: automatedActionKeys.list(),
    queryFn: async () => {
      const { data } = await apiClient.get<{ results: AutomatedAction[] }>(EP, {
        params: { page_size: 500 },
      });
      return data.results ?? [];
    },
  });
}

export function useCreateAutomatedAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<AutomatedAction>) =>
      apiClient.post<AutomatedAction>(EP, payload).then((r) => r.data),
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: automatedActionKeys.byRule(data.status_rule) }),
  });
}

export function useUpdateAutomatedAction(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<AutomatedAction>) =>
      apiClient.patch<AutomatedAction>(`${EP}${id}/`, payload).then((r) => r.data),
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: automatedActionKeys.byRule(data.status_rule) }),
  });
}

export function useDeleteAutomatedAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ruleId }: { id: string; ruleId: string }) =>
      apiClient.delete(`${EP}${id}/`).then(() => ruleId),
    onSuccess: (ruleId) =>
      qc.invalidateQueries({ queryKey: automatedActionKeys.byRule(ruleId) }),
  });
}

export function useContentTypes() {
  return useQuery({
    queryKey: ["content-types"],
    queryFn: async () => {
      const { data } = await apiClient.get<ContentTypeOption[]>(CT_EP);
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 min — content types rarely change
  });
}
