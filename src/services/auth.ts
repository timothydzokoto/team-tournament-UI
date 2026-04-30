import { apiRequest } from './api';
import { clearStoredAccessToken, getStoredAccessToken, setStoredAccessToken } from './secure-store';

export type SignupPayload = {
  username: string;
  email: string;
  password: string;
};

export type SignupResponse = {
  access_token: string;
  token_type: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
};

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
};

export async function login(payload: LoginPayload) {
  const response = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  await setStoredAccessToken(response.access_token);
  return response;
}

export async function signup(payload: SignupPayload) {
  const response = await apiRequest<SignupResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  await setStoredAccessToken(response.access_token);
  return response;
}

export async function getCurrentUser(token: string) {
  return apiRequest<AuthUser>('/auth/me', {
    method: 'GET',
    token,
  });
}

export async function restoreSession() {
  const token = await getStoredAccessToken();
  if (!token) {
    return null;
  }

  const user = await getCurrentUser(token);
  return { token, user };
}

export async function logout() {
  await clearStoredAccessToken();
}
