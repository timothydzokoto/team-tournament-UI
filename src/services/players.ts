import { API_BASE_URL } from '../config/api';
import { ApiError, apiRequest, getPageItems, type PageResponse } from './api';

export type Player = {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  height: number | null;
  weight: number | null;
  position: string | null;
  jersey_number: number | null;
  is_active: boolean;
  subteam_id: number;
  face_image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type PlayerFaceMatch = {
  player_id: number;
  player_name: string;
  confidence: number;
  face_image_url: string | null;
};

export type PlayerCreateInput = {
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  height?: number | null;
  weight?: number | null;
  position?: string | null;
  jersey_number?: number | null;
  is_active: boolean;
  subteam_id: number;
};

export type PlayerUpdateInput = PlayerCreateInput;

export async function getPlayers(token: string, subteamId: number, search?: string) {
  const params = new URLSearchParams({ skip: '0', limit: '100', subteam_id: String(subteamId) });

  if (search?.trim()) {
    params.set('search', search.trim());
  }

  const payload = await apiRequest<Player[] | PageResponse<Player>>(
    `/players?${params.toString()}`,
    {
      method: 'GET',
      token,
    }
  );

  return getPageItems(payload);
}

export async function getPlayer(token: string, playerId: number) {
  return apiRequest<Player>(`/players/${playerId}`, {
    method: 'GET',
    token,
  });
}

export async function createPlayer(token: string, payload: PlayerCreateInput) {
  return apiRequest<Player>('/players/', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export async function updatePlayer(token: string, playerId: number, payload: PlayerUpdateInput) {
  return apiRequest<Player>(`/players/${playerId}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  });
}

export async function deletePlayer(token: string, playerId: number) {
  return apiRequest<{ message: string }>(`/players/${playerId}`, {
    method: 'DELETE',
    token,
  });
}

export async function matchPlayerFace(
  token: string,
  asset: { uri: string; fileName?: string | null; mimeType?: string | null }
) {
  const formData = new FormData();

  formData.append('file', {
    uri: asset.uri,
    name: asset.fileName || 'face-match.jpg',
    type: asset.mimeType || 'image/jpeg',
  } as unknown as Blob);

  const response = await fetch(`${API_BASE_URL}/players/face-match`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: formData,
  });

  const text = await response.text();
  const payload = text ? tryParseJson(text) : null;

  if (!response.ok) {
    const detail = getErrorDetail(payload, text, response.status);
    throw new ApiError(response.status, detail);
  }

  return payload as PlayerFaceMatch;
}

export async function uploadPlayerFace(
  token: string,
  playerId: number,
  asset: { uri: string; fileName?: string | null; mimeType?: string | null }
) {
  const formData = new FormData();

  formData.append('file', {
    uri: asset.uri,
    name: asset.fileName || `player-${playerId}.jpg`,
    type: asset.mimeType || 'image/jpeg',
  } as unknown as Blob);

  const response = await fetch(`${API_BASE_URL}/players/${playerId}/upload-face`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: formData,
  });

  const text = await response.text();
  const payload = text ? tryParseJson(text) : null;

  if (!response.ok) {
    const detail = getErrorDetail(payload, text, response.status);
    throw new ApiError(response.status, detail);
  }

  return (
    (payload as { message: string; face_image_url: string }) ?? {
      message: 'Face uploaded successfully',
      face_image_url: '',
    }
  );
}

function tryParseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function getErrorDetail(payload: unknown, fallbackText: string, status: number) {
  if (payload && typeof payload === 'object') {
    if ('detail' in payload && typeof payload.detail === 'string') {
      return payload.detail;
    }

    if ('message' in payload && typeof payload.message === 'string') {
      return payload.message;
    }
  }

  if (fallbackText) {
    return fallbackText;
  }

  return `Request failed with status ${status}`;
}
