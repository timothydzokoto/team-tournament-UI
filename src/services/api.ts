import { API_BASE_URL, API_TIMEOUT_MS } from '../config/api';

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

export type FaceFlowMode = 'upload' | 'match';

type RequestOptions = RequestInit & {
  token?: string | null;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    const text = await response.text();
    const payload = text ? tryParseJson(text) : null;

    if (!response.ok) {
      const detail = getErrorDetail(payload, text, response.status);
      throw new ApiError(response.status, detail);
    }

    return (payload as T) ?? ({} as T);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(408, 'Request timed out. Check your connection and backend URL.');
    }

    throw new ApiError(
      0,
      'Could not reach the backend. Verify the API base URL and that the server is running.'
    );
  } finally {
    clearTimeout(timeoutId);
  }
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

export function getFaceFlowErrorMessage(error: unknown, mode: FaceFlowMode) {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return 'Could not reach the backend. Check your network and confirm the API is running.';
    }

    if (error.status === 408) {
      return 'The request timed out. Retry with a smaller image or a more stable connection.';
    }

    if (error.status === 503) {
      return 'Face recognition is unavailable on the backend right now.';
    }

    if (error.status === 400) {
      if (error.detail === 'Invalid image file') {
        return 'This file is not a valid image. Use a clear JPG or PNG photo.';
      }

      if (error.detail === 'Unable to decode image for face analysis') {
        return 'The backend could not read this image. Try a different photo or recapture it.';
      }
    }

    if (error.status === 422) {
      if (error.detail === 'No face detected in the image') {
        return mode === 'upload'
          ? 'No face was detected. Capture one clear face centered in the frame before enrolling.'
          : 'No face was detected. Retry with one clear face centered in the frame.';
      }

      if (error.detail === 'Multiple faces detected in the image') {
        return mode === 'upload'
          ? 'Multiple faces were detected. Use an image with only the player you want to enroll.'
          : 'Multiple faces were detected. Retry with only one face visible.';
      }
    }

    if (mode === 'match' && error.status === 404) {
      return 'No matching player was found for this face image.';
    }

    return error.detail;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return mode === 'upload'
    ? 'Something went wrong while uploading the face image.'
    : 'Something went wrong while verifying the face image.';
}
