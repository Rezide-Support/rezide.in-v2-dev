"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { errorMessage } from "@/lib/api/client";
import { dashboardQueries } from "@/lib/queries";
import {
  addTeamMember,
  createContact,
  createGroup,
  deleteContact,
  deleteGroup,
  saveFirmProfile,
  saveMyProfile,
  updateContact,
  updateGroup,
  updateTeam,
} from "@/services/dashboard";
import type { ContactInput, ContactPatch, GroupInput, TeamMember } from "@/types/dashboard";

/* CRM hooks. Requests go through src/services/dashboard.ts; models live in src/types/dashboard.ts. */

export type {
  Contact,
  ContactGroup,
  CreditEntry,
  CreditsData,
  FirmProfile,
  GroupWithCount,
  MyProfile,
  Team,
  TeamData,
  TeamMember,
  UploadFile,
  UploadRecord,
} from "@/types/dashboard";

/** Dashboard query options (keys all start with "dashboard"). */
export const dq = dashboardQueries;

/** Wraps a CRM write: invalidates the dashboard cache and reports failures as a toast. */
function useDashboardMutation<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard"] }),
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export const useCreateContact = () => useDashboardMutation((c: ContactInput) => createContact(c));
export const useUpdateContact = () => useDashboardMutation(({ id, ...patch }: ContactPatch & { id: string }) => updateContact(id, patch));
export const useDeleteContact = () => useDashboardMutation((id: string) => deleteContact(id));

export const useSaveGroup = () =>
  useDashboardMutation(({ id, ...g }: GroupInput & { id?: string }) => (id ? updateGroup(id, g) : createGroup(g)));
export const useDeleteGroup = () => useDashboardMutation((id: string) => deleteGroup(id));

export const useUpdateTeam = () => useDashboardMutation(updateTeam);
export const useAddMember = () =>
  useDashboardMutation((m: Partial<Omit<TeamMember, "id">> & Pick<TeamMember, "name">) => addTeamMember(m));

export const useSaveFirm = () => useDashboardMutation(saveFirmProfile);
export const useSaveMe = () => useDashboardMutation(saveMyProfile);
