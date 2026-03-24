import { apiRequest } from './api';

export type Team = {
  id: number;
  name: string;
  description: string | null;
  coach_name: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type TeamCreateInput = {
  name: string;
  description?: string | null;
  coach_name?: string | null;
  logo_url?: string | null;
};

export type TeamUpdateInput = TeamCreateInput;

export async function getTeams(token: string, search?: string) {
  const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';

  return apiRequest<Team[]>(`/teams${query}`, {
    method: 'GET',
    token,
  });
}

export async function getTeam(token: string, teamId: number) {
  return apiRequest<Team>(`/teams/${teamId}`, {
    method: 'GET',
    token,
  });
}

export async function createTeam(token: string, payload: TeamCreateInput) {
  return apiRequest<Team>('/teams/', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export async function updateTeam(token: string, teamId: number, payload: TeamUpdateInput) {
  return apiRequest<Team>(`/teams/${teamId}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  });
}

export async function deleteTeam(token: string, teamId: number) {
  return apiRequest<{ message: string }>(`/teams/${teamId}`, {
    method: 'DELETE',
    token,
  });
}
