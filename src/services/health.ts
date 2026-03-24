import { API_ORIGIN, API_TIMEOUT_MS } from '../config/api';
import { ApiError } from './api';

export type BackendHealth = {
  status: string;
  message: string;
  services: {
    database: string;
    redis: string;
    face_recognition: string;
    uploads_dir: string;
  };
};

export async function getBackendHealth() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_ORIGIN}/health`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    const text = await response.text();
    const payload = text ? (JSON.parse(text) as BackendHealth) : null;

    if (!response.ok || !payload) {
      throw new ApiError(response.status, 'Health endpoint did not return a usable response.');
    }

    return payload;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(408, 'Health check timed out.');
    }

    throw new ApiError(0, 'Could not reach the backend health endpoint.');
  } finally {
    clearTimeout(timeoutId);
  }
}
