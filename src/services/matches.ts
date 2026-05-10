import { apiRequest, getPageItems, type PageResponse } from './api';

export type MatchStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

export type Match = {
  id: number;
  tournament_id: number;
  home_team_id: number;
  away_team_id: number;
  scheduled_at: string;
  venue: string | null;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  created_at: string;
  updated_at: string;
};

export type MatchCreateInput = {
  tournament_id: number;
  home_team_id: number;
  away_team_id: number;
  scheduled_at: string;
  venue?: string | null;
  status?: MatchStatus;
};

export type MatchUpdateInput = {
  scheduled_at?: string | null;
  venue?: string | null;
  status?: MatchStatus;
  home_score?: number | null;
  away_score?: number | null;
};

export type PlayerMatchStat = {
  id: number;
  match_id: number;
  player_id: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  minutes_played: number;
  created_at: string;
  updated_at: string;
};

export type PlayerMatchStatInput = {
  player_id: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  minutes_played: number;
};

export type PlayerMatchStatUpdateInput = Partial<Omit<PlayerMatchStatInput, 'player_id'>>;

export async function getMatches(token: string, tournamentId?: number, status?: MatchStatus) {
  const params = new URLSearchParams({ skip: '0', limit: '100' });

  if (tournamentId) {
    params.set('tournament_id', String(tournamentId));
  }

  if (status) {
    params.set('status', status);
  }

  const payload = await apiRequest<Match[] | PageResponse<Match>>(`/matches?${params.toString()}`, {
    method: 'GET',
    token,
  });

  return getPageItems(payload);
}

export async function createMatch(token: string, payload: MatchCreateInput) {
  return apiRequest<Match>('/matches/', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export async function updateMatch(token: string, matchId: number, payload: MatchUpdateInput) {
  return apiRequest<Match>(`/matches/${matchId}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  });
}

export async function deleteMatch(token: string, matchId: number) {
  return apiRequest<{ message: string }>(`/matches/${matchId}`, {
    method: 'DELETE',
    token,
  });
}

export async function getMatchStats(token: string, matchId: number) {
  return apiRequest<PlayerMatchStat[]>(`/matches/${matchId}/stats`, {
    method: 'GET',
    token,
  });
}

export async function recordPlayerMatchStat(
  token: string,
  matchId: number,
  payload: PlayerMatchStatInput
) {
  return apiRequest<PlayerMatchStat>(`/matches/${matchId}/stats`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export async function updatePlayerMatchStat(
  token: string,
  matchId: number,
  playerId: number,
  payload: PlayerMatchStatUpdateInput
) {
  return apiRequest<PlayerMatchStat>(`/matches/${matchId}/stats/${playerId}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  });
}

export async function deletePlayerMatchStat(token: string, matchId: number, playerId: number) {
  return apiRequest<{ message: string }>(`/matches/${matchId}/stats/${playerId}`, {
    method: 'DELETE',
    token,
  });
}
