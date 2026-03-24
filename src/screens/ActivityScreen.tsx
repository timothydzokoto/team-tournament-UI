import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppScreen } from '../components/ui/AppScreen';
import { FeedbackState } from '../components/ui/FeedbackState';
import { HeroPanel } from '../components/ui/HeroPanel';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import {
  getVerificationHistory,
  type VerificationHistoryItem,
} from '../services/verification-history';

type Props = {
  refreshKey: number;
  onOpenMatchedPlayer: (player: { playerId: number; playerName: string }) => void;
};

export function ActivityScreen({ onOpenMatchedPlayer, refreshKey }: Props) {
  const [history, setHistory] = useState<VerificationHistoryItem[]>([]);

  const loadHistory = useCallback(async () => {
    const nextHistory = await getVerificationHistory();
    setHistory(nextHistory);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, refreshKey]);

  return (
    <AppScreen
      accent="violet"
      hero={
        <HeroPanel
          accent="violet"
          eyebrow="Activity"
          title="Verification history"
          description="Review recent biometric outcomes captured on this device. Use this view to spot no-match patterns, failed attempts, and strong matches."
          aside={<StatusBadge label={`${history.length} items`} tone="violet" />}
        />
      }>
      <SurfaceCard
        eyebrow="Recent"
        title="Face verification events"
        action={<AppButton label="Refresh history" onPress={loadHistory} variant="secondary" />}>
        {history.length === 0 ? (
          <FeedbackState
            title="No activity yet"
            message="Run a face verification attempt and it will appear here on this device."
          />
        ) : (
          <View className="gap-3">
            {history.map((item) => (
              <VerificationHistoryCard
                key={item.id}
                item={item}
                onOpenPlayer={
                  item.player_id && item.player_name
                    ? () =>
                        onOpenMatchedPlayer({
                          playerId: item.player_id!,
                          playerName: item.player_name!,
                        })
                    : undefined
                }
              />
            ))}
          </View>
        )}
      </SurfaceCard>
    </AppScreen>
  );
}

function VerificationHistoryCard({
  item,
  onOpenPlayer,
}: {
  item: VerificationHistoryItem;
  onOpenPlayer?: () => void;
}) {
  const tone =
    item.status === 'matched' ? 'emerald' : item.status === 'no_match' ? 'amber' : 'rose';

  return (
    <View className="rounded-[26px] border border-stone-800 bg-pitch p-4">
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <Text className="text-sm font-semibold text-fog">{getHistoryTitle(item)}</Text>
          <Text className="mt-2 text-sm leading-6 text-stone-300">{item.message}</Text>
        </View>
        <StatusBadge label={getHistoryBadge(item)} tone={tone} />
      </View>

      <View className="mt-4 gap-2">
        <HistoryRow label="Source" value={item.source === 'camera' ? 'Camera' : 'Library'} />
        <HistoryRow label="Time" value={formatRelativeTime(item.created_at)} />
        {typeof item.confidence === 'number' ? (
          <HistoryRow label="Confidence" value={`${Math.round(item.confidence * 100)}%`} />
        ) : null}
      </View>

      {onOpenPlayer ? (
        <View className="mt-4">
          <AppButton label="Open matched player" onPress={onOpenPlayer} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

function HistoryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className="text-xs uppercase tracking-[1px] text-stone-500">{label}</Text>
      <Text className="text-sm text-stone-200">{value}</Text>
    </View>
  );
}

function getHistoryTitle(item: VerificationHistoryItem) {
  if (item.status === 'matched') {
    return item.player_name || 'Matched player';
  }

  if (item.status === 'no_match') {
    return 'No match found';
  }

  return 'Verification error';
}

function getHistoryBadge(item: VerificationHistoryItem) {
  if (item.status === 'matched') {
    return 'Matched';
  }

  if (item.status === 'no_match') {
    return 'No match';
  }

  return 'Error';
}

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}
