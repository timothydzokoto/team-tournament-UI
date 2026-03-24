import { Platform } from 'react-native';

const FALLBACK_ANDROID_URL = 'http://10.0.2.2:8000';
const FALLBACK_IOS_URL = 'http://127.0.0.1:8000';
const FALLBACK_WEB_URL = 'http://localhost:8000';

function getFallbackBaseUrl() {
  if (Platform.OS === 'android') {
    return FALLBACK_ANDROID_URL;
  }

  if (Platform.OS === 'web') {
    return FALLBACK_WEB_URL;
  }

  return FALLBACK_IOS_URL;
}

export const API_ORIGIN = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || getFallbackBaseUrl();
export const API_BASE_URL = `${API_ORIGIN}/api/v1`;
export const API_TIMEOUT_MS = 15000;
