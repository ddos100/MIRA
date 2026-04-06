/**
 * Users and User Groups API hooks.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserDetail {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  role: string;
  department?: string;
  job_title?: string;
  phone?: string;
  avatar?: string;
  timezone?: string;
  bio?: string;
  is_mfa_enabled: boolean;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  business_units: string[];
  groups: number[];
}

export interface UserGroup {
  id: string;
  name: string;
  description: string;
  default_role: string;
  business_units: string[];
  member_count: number;
  member_ids: string[];
  created_at: string;
  updated_at: string;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const authKeys = {
  users: () => ["users"] as const,
  userList: (p: object) => [...authKeys.users(), "list", p] as const,
  userDetail: (id: string) => [...authKeys.users(), id] as const,
  groups: () => ["user-groups"] as const,
  groupList: (p: object) => [...authKeys.groups(), "list", p] as const,
  groupDetail: (id: string) => [...authKeys.groups(), id] as const,
};

// ─── User Hooks ───────────────────────────────────────────────────────────────

export function useUsers(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: authKeys.userList(params ?? {}),
    queryFn: () =>
      apiClient
        .get("/auth/users/", { params: { page_size: 100, ...params } })
        .then((r) => r.data),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: authKeys.userDetail(id),
    queryFn: () =>
      apiClient.get(`/auth/users/${id}/`).then((r) => r.data as UserDetail),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/auth/users/", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: authKeys.users() }),
  });
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.patch(`/auth/users/${id}/`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: authKeys.users() });
      qc.invalidateQueries({ queryKey: authKeys.userDetail(id) });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/auth/users/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: authKeys.users() }),
  });
}

// ─── User Group Hooks ─────────────────────────────────────────────────────────

export function useUserGroups(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: authKeys.groupList(params ?? {}),
    queryFn: () =>
      apiClient
        .get("/auth/groups/", { params: { page_size: 100, ...params } })
        .then((r) => r.data),
  });
}

export function useUserGroup(id: string) {
  return useQuery({
    queryKey: authKeys.groupDetail(id),
    queryFn: () =>
      apiClient.get(`/auth/groups/${id}/`).then((r) => r.data as UserGroup),
    enabled: !!id,
  });
}

export function useCreateUserGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/auth/groups/", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: authKeys.groups() }),
  });
}

export function useUpdateUserGroup(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.patch(`/auth/groups/${id}/`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: authKeys.groups() });
      qc.invalidateQueries({ queryKey: authKeys.groupDetail(id) });
    },
  });
}

export function useDeleteUserGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/auth/groups/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: authKeys.groups() }),
  });
}

export function useAddGroupMembers(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userIds: string[]) =>
      apiClient
        .post(`/auth/groups/${groupId}/add-members/`, { user_ids: userIds })
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: authKeys.groupDetail(groupId) }),
  });
}

export function useRemoveGroupMembers(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userIds: string[]) =>
      apiClient
        .post(`/auth/groups/${groupId}/remove-members/`, { user_ids: userIds })
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: authKeys.groupDetail(groupId) }),
  });
}
