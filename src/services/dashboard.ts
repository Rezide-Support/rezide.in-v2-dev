import { api } from "@/lib/api/client";
import type {
  AssociableProject,
  AssociableProjectQuery,
  Contact,
  ContactGroup,
  ContactInput,
  ContactPatch,
  CreditsData,
  FirmProfile,
  GroupInput,
  GroupWithCount,
  MyProfile,
  TeamData,
  TeamMember,
  TeamPatch,
  UploadDetail,
  UploadFile,
} from "@/types/dashboard";

/*
 * Realtor CRM endpoints (/dashboard/*). Every call is scoped to the signed-in
 * realtor's firm on the server; no firm id is sent from the client.
 * In mock mode writes live in memory until reload.
 */

const enc = encodeURIComponent;

/* ---------- Contacts ---------- */

export async function fetchContacts() {
  const { data } = await api.get<Contact[]>("/dashboard/contacts");
  return data;
}

export async function fetchContact(id: string) {
  const { data } = await api.get<Contact>(`/dashboard/contacts/${enc(id)}`);
  return data;
}

export async function createContact(input: ContactInput) {
  const { data } = await api.post<Contact>("/dashboard/contacts", input);
  return data;
}

export async function updateContact(id: string, patch: ContactPatch) {
  const { data } = await api.patch<Contact>(`/dashboard/contacts/${enc(id)}`, patch);
  return data;
}

export async function deleteContact(id: string) {
  await api.delete<void>(`/dashboard/contacts/${enc(id)}`);
}

/* ---------- Groups ---------- */

export async function fetchGroups() {
  const { data } = await api.get<GroupWithCount[]>("/dashboard/groups");
  return data;
}

export async function createGroup(input: GroupInput) {
  const { data } = await api.post<ContactGroup>("/dashboard/groups", input);
  return data;
}

export async function updateGroup(id: string, patch: GroupInput) {
  const { data } = await api.patch<ContactGroup>(`/dashboard/groups/${enc(id)}`, patch);
  return data;
}

export async function deleteGroup(id: string) {
  await api.delete<void>(`/dashboard/groups/${enc(id)}`);
}

/* ---------- Database uploads ---------- */

export async function fetchUploads() {
  const { data } = await api.get<UploadFile[]>("/dashboard/uploads");
  return data;
}

export async function fetchUpload(id: string) {
  const { data } = await api.get<UploadDetail>(`/dashboard/uploads/${enc(id)}`);
  return data;
}

/* ---------- Credits, team, profiles ---------- */

export async function fetchCredits() {
  const { data } = await api.get<CreditsData>("/dashboard/credits");
  return data;
}

export async function fetchTeam() {
  const { data } = await api.get<TeamData>("/dashboard/team");
  return data;
}

export async function updateTeam(patch: TeamPatch) {
  const { data } = await api.patch<TeamData>("/dashboard/team", patch);
  return data;
}

export async function addTeamMember(input: Partial<Omit<TeamMember, "id">> & Pick<TeamMember, "name">) {
  const { data } = await api.post<TeamMember>("/dashboard/team/members", input);
  return data;
}

export async function fetchFirmProfile() {
  const { data } = await api.get<FirmProfile>("/dashboard/firm");
  return data;
}

export async function saveFirmProfile(patch: Partial<FirmProfile>) {
  const { data } = await api.put<FirmProfile>("/dashboard/firm", patch);
  return data;
}

export async function fetchMyProfile() {
  const { data } = await api.get<MyProfile>("/dashboard/me");
  return data;
}

export async function saveMyProfile(patch: Partial<MyProfile>) {
  const { data } = await api.put<MyProfile>("/dashboard/me", patch);
  return data;
}

/* ---------- Associate Property ---------- */

/** Rezide projects a contact's unit can be linked to, filtered by CRM type, unit type and text. */
export async function fetchAssociableProjects(query: AssociableProjectQuery) {
  const { data } = await api.get<AssociableProject[]>("/dashboard/associable-projects", {
    params: { propertyType: query.propertyType, unitType: query.unitType, q: query.q || undefined },
  });
  return data;
}

/** Unit numbers known for one tower of an associable project. */
export async function fetchAssociableUnits(projectId: string, tower: string) {
  const { data } = await api.get<string[]>(`/dashboard/associable-projects/${enc(projectId)}/units`, { params: { tower } });
  return data;
}
