import { apiRequest, getPageItems, type PageResponse } from './api';
import type { Match } from './matches';

export type TournamentStatus = 'upcoming' | 'ongoing' | 'completed';

export type Tournament = {
  id: number;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: TournamentStatus;
  created_at: string;
  updated_at: string;
};

export type TeamStanding = {
  team_id: number;
  team_name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
};

export type TopScorer = {
  player_id: number;
  player_name: string;
  goals: number;
  assists: number;
  matches_played: number;
};

export async function getTournaments(token: string, status?: TournamentStatus, search?: string) {
  const params = new URLSearchParams({ skip: '0', limit: '100' });

  if (status) {
    params.set('status', status);
  }

  if (search?.trim()) {
    params.set('search', search.trim());
  }

  const payload = await apiRequest<Tournament[] | PageResponse<Tournament>>(
    `/tournaments?${params.toString()}`,
    {
      method: 'GET',
      token,
    }
  );

  return getPageItems(payload);
}

export async function getTournamentMatches(token: string, tournamentId: number) {
  const params = new URLSearchParams({ skip: '0', limit: '100' });
  const payload = await apiRequest<Match[] | PageResponse<Match>>(
    `/tournaments/${tournamentId}/matches?${params.toString()}`,
    {
      method: 'GET',
      token,
    }
  );

  return getPageItems(payload);
}

export async function getTournamentStandings(token: string, tournamentId: number) {
  return apiRequest<TeamStanding[]>(`/tournaments/${tournamentId}/standings`, {
    method: 'GET',
    token,
  });
}

export async function getTopScorers(token: string, tournamentId: number, limit = 10) {
  const params = new URLSearchParams({ limit: String(limit) });
  return apiRequest<TopScorer[]>(`/tournaments/${tournamentId}/top-scorers?${params.toString()}`, {
    method: 'GET',
    token,
  });
}
