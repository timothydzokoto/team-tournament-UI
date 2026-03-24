import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const VERIFICATION_HISTORY_KEY = 'team_tournament_verification_history';
const MAX_HISTORY_ITEMS = 8;

export type VerificationHistoryItem = {
  id: string;
  created_at: string;
  source: 'camera' | 'library';
  status: 'matched' | 'no_match' | 'error';
  player_id?: number;
  player_name?: string;
  confidence?: number;
  message: string;
};

export async function getVerificationHistory() {
  const rawValue = await getValue(VERIFICATION_HISTORY_KEY);
  if (!rawValue) {
    return [] as VerificationHistoryItem[];
  }

  try {
    const parsed = JSON.parse(rawValue) as VerificationHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addVerificationHistoryItem(
  item: Omit<VerificationHistoryItem, 'id' | 'created_at'>
) {
  const current = await getVerificationHistory();
  const nextItem: VerificationHistoryItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
  };

  const next = [nextItem, ...current].slice(0, MAX_HISTORY_ITEMS);
  await setValue(VERIFICATION_HISTORY_KEY, JSON.stringify(next));

  return nextItem;
}

async function getValue(key: string) {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(key) ?? null;
  }

  return SecureStore.getItemAsync(key);
}

async function setValue(key: string, value: string) {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(key, value);
    return;
  }

  return SecureStore.setItemAsync(key, value);
}
