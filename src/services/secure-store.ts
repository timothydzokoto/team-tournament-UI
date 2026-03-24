import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'team_tournament_access_token';

function isWeb() {
  return Platform.OS === 'web';
}

export async function getStoredAccessToken() {
  if (isWeb()) {
    return globalThis.localStorage?.getItem(ACCESS_TOKEN_KEY) ?? null;
  }

  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function setStoredAccessToken(token: string) {
  if (isWeb()) {
    globalThis.localStorage?.setItem(ACCESS_TOKEN_KEY, token);
    return;
  }

  return SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function clearStoredAccessToken() {
  if (isWeb()) {
    globalThis.localStorage?.removeItem(ACCESS_TOKEN_KEY);
    return;
  }

  return SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}
