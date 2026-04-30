import { apiRequest, getPageItems, type PageResponse } from './api';

export type Subteam = {
  id: number;
  name: string;
  description: string | null;
  team_id: number;
  created_at: string;
  updated_at: string;
};

export type SubteamCreateInput = {
  name: string;
  description?: string | null;
  team_id: number;
};

export type SubteamUpdateInput = SubteamCreateInput;

export async function getSubteams(token: string, teamId: number, search?: string) {
  const params = new URLSearchParams({ skip: '0', limit: '100', team_id: String(teamId) });

  if (search?.trim()) {
    params.set('search', search.trim());
  }

  const payload = await apiRequest<Subteam[] | PageResponse<Subteam>>(
    `/subteams?${params.toString()}`,
    {
      method: 'GET',
      token,
    }
  );

  return getPageItems(payload);
}

export async function getSubteam(token: string, subteamId: number) {
  return apiRequest<Subteam>(`/subteams/${subteamId}`, {
    method: 'GET',
    token,
  });
}

export async function createSubteam(token: string, payload: SubteamCreateInput) {
  return apiRequest<Subteam>('/subteams/', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export async function updateSubteam(token: string, subteamId: number, payload: SubteamUpdateInput) {
  return apiRequest<Subteam>(`/subteams/${subteamId}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  });
}

export async function deleteSubteam(token: string, subteamId: number) {
  return apiRequest<{ message: string }>(`/subteams/${subteamId}`, {
    method: 'DELETE',
    token,
  });
}
