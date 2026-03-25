import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppScreen } from '../components/ui/AppScreen';
import { FeedbackState } from '../components/ui/FeedbackState';
import { HeroPanel } from '../components/ui/HeroPanel';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { useSession } from '../context/SessionContext';
import { getConnectivityMessage, isConnectivityError } from '../services/api';
import { getBackendHealth, type BackendHealth } from '../services/health';
import { getTeams } from '../services/teams';
import {
  getVerificationHistory,
  type VerificationHistoryItem,
} from '../services/verification-history';

type Props = {
  onOpenTeams: () => void;
  onOpenFaceMatch: () => void;
};

export function HomeScreen({ onOpenTeams, onOpenFaceMatch }: Props) {
  const { token, user } = useSession();
  const [teamCount, setTeamCount] = useState<number>(0);
  const [history, setHistory] = useState<VerificationHistoryItem[]>([]);
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [snapshotConnectivityError, setSnapshotConnectivityError] = useState(false);
  const [healthConnectivityError, setHealthConnectivityError] = useState(false);

  const loadHomeData = useCallback(async () => {
    if (!token) {
      return;
    }

    const [teamsResult, historyResult, healthResult] = await Promise.allSettled([
      getTeams(token),
      getVerificationHistory(),
      getBackendHealth(),
    ]);

    if (teamsResult.status === 'fulfilled') {
      setTeamCount(teamsResult.value.length);
      setSnapshotError(null);
      setSnapshotConnectivityError(false);
    } else {
      setSnapshotConnectivityError(isConnectivityError(teamsResult.reason));
      setSnapshotError(
        getConnectivityMessage(teamsResult.reason, 'Could not load the current operator snapshot.')
      );
    }

    if (historyResult.status === 'fulfilled') {
      setHistory(historyResult.value);
    }

    if (healthResult.status === 'fulfilled') {
      setHealth(healthResult.value);
      setHealthError(null);
      setHealthConnectivityError(false);
    } else {
      setHealthConnectivityError(isConnectivityError(healthResult.reason));
      setHealthError(
        getConnectivityMessage(healthResult.reason, 'Could not load backend readiness.')
      );
    }
  }, [token]);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  return (
    <AppScreen
      accent="emerald"
      hero={
        <HeroPanel
          accent="emerald"
          eyebrow="Overview"
          title="Operator home"
          description={`Use quick actions for verification and team management. This home view keeps current readiness and recent device activity in one place for ${user?.username}.`}
          aside={
            <View className="gap-3 md:items-end">
              <StatusBadge label="Ready" tone="emerald" />
              <AppButton label="Verify face" onPress={onOpenFaceMatch} variant="primary" />
            </View>
          }
        />
      }>
      <SurfaceCard eyebrow="Snapshot" title="Current status">
        {snapshotError ? (
          <View className="mb-3">
            <FeedbackState
              title={snapshotConnectivityError ? 'Snapshot unavailable' : 'Snapshot issue'}
              message={snapshotError}
              tone="error"
            />
          </View>
        ) : null}
        <View className="gap-3 md:flex-row">
          <SummaryTile
            label="Teams"
            value={String(teamCount)}
            helper="available for management"
            tone="emerald"
          />
          <SummaryTile
            label="Verifications"
            value={String(history.length)}
            helper="stored on this device"
            tone="amber"
          />
          <SummaryTile
            label="Match rate"
            value={`${getMatchRate(history)}%`}
            helper="recent verification history"
            tone="sky"
          />
          <SummaryTile
            label="Best confidence"
            value={getBestConfidence(history)}
            helper="highest recent match"
            tone="violet"
          />
        </View>
      </SurfaceCard>

      <SurfaceCard
        eyebrow="Backend"
        title="Service readiness"
        action={<AppButton label="Refresh status" onPress={loadHomeData} variant="secondary" />}>
        {health ? (
          <View className="gap-3 md:flex-row">
            <HealthTile
              label="API"
              value={health.status}
              helper={health.message}
              tone={health.status === 'healthy' ? 'emerald' : 'amber'}
            />
            <HealthTile
              label="Database"
              value={health.services.database}
              helper="primary persistence"
              tone={health.services.database === 'healthy' ? 'emerald' : 'rose'}
            />
            <HealthTile
              label="Redis"
              value={health.services.redis}
              helper="cache and queue support"
              tone={health.services.redis === 'healthy' ? 'sky' : 'amber'}
            />
            <HealthTile
              label="Face recognition"
              value={health.services.face_recognition}
              helper="required for enrollment and match"
              tone={health.services.face_recognition === 'available' ? 'emerald' : 'rose'}
            />
          </View>
        ) : healthError ? (
          <View className="gap-3">
            <FeedbackState
              title={healthConnectivityError ? 'Backend unreachable' : 'Status unavailable'}
              message={healthError}
              tone="error"
            />
            <AppButton label="Retry status check" onPress={loadHomeData} variant="secondary" />
          </View>
        ) : (
          <FeedbackState
            title="No status yet"
            message="Run a refresh to confirm backend readiness and biometric service availability."
          />
        )}
      </SurfaceCard>

      <SurfaceCard eyebrow="Actions" title="Primary workflows">
        <View className="gap-3 md:flex-row">
          <QuickActionCard
            title="Open teams"
            description="Manage teams, subteams, players, and enrollment records."
            actionLabel="Go to teams"
            tone="emerald"
            onPress={onOpenTeams}
          />
          <QuickActionCard
            title="Run face match"
            description="Capture or choose a face image and verify it against enrolled players."
            actionLabel="Go to verify"
            tone="amber"
            onPress={onOpenFaceMatch}
          />
        </View>
      </SurfaceCard>

      <SurfaceCard eyebrow="Decision support" title="Next best action">
        <View className="gap-3 md:flex-row">
          <DecisionCard
            title={getNextActionTitle(health, teamCount)}
            description={getNextActionDescription(health, teamCount)}
            badge={getNextActionBadge(health, teamCount)}
            tone={getNextActionTone(health, teamCount)}
          />
          <DecisionCard
            title="Latest verification signal"
            description={getLatestHistoryMessage(history)}
            badge={history[0] ? formatRelativeTime(history[0].created_at) : 'No history'}
            tone={
              history[0]?.status === 'matched'
                ? 'emerald'
                : history[0]?.status === 'no_match'
                  ? 'amber'
                  : 'sky'
            }
          />
        </View>
      </SurfaceCard>
    </AppScreen>
  );
}

function QuickActionCard({
  actionLabel,
  description,
  onPress,
  title,
  tone,
}: {
  actionLabel: string;
  description: string;
  onPress: () => void;
  title: string;
  tone: 'amber' | 'emerald';
}) {
  return (
    <View className="flex-1 rounded-[26px] border border-line bg-panelRaised p-4">
      <StatusBadge label={tone === 'amber' ? 'Verification' : 'Management'} tone={tone} />
      <Text className="mt-3 text-lg font-semibold text-stone-50">{title}</Text>
      <Text className="mt-2 text-sm leading-6 text-mist">{description}</Text>
      <View className="mt-4">
        <AppButton label={actionLabel} onPress={onPress} variant="ghost" />
      </View>
    </View>
  );
}

function SummaryTile({
  helper,
  label,
  tone,
  value,
}: {
  helper: string;
  label: string;
  tone: 'amber' | 'emerald' | 'sky' | 'violet';
  value: string;
}) {
  return (
    <View className="flex-1 rounded-[26px] border border-line bg-panelRaised p-4">
      <StatusBadge label={label} tone={tone} />
      <Text className="mt-4 text-3xl font-semibold text-stone-50">{value}</Text>
      <Text className="mt-2 text-sm leading-6 text-mist">{helper}</Text>
    </View>
  );
}

function DecisionCard({
  badge,
  description,
  title,
  tone,
}: {
  badge: string;
  description: string;
  title: string;
  tone: 'amber' | 'emerald' | 'sky' | 'violet';
}) {
  return (
    <View className="flex-1 rounded-[26px] border border-line bg-panelRaised p-4">
      <StatusBadge label={badge} tone={tone} />
      <Text className="mt-3 text-lg font-semibold text-stone-50">{title}</Text>
      <Text className="mt-2 text-sm leading-6 text-mist">{description}</Text>
    </View>
  );
}

function HealthTile({
  helper,
  label,
  tone,
  value,
}: {
  helper: string;
  label: string;
  tone: 'amber' | 'emerald' | 'rose' | 'sky';
  value: string;
}) {
  return (
    <View className="flex-1 rounded-[26px] border border-line bg-panelRaised p-4">
      <StatusBadge label={label} tone={tone} />
      <Text className="mt-4 text-2xl font-semibold capitalize text-stone-50">{value}</Text>
      <Text className="mt-2 text-sm leading-6 text-mist">{helper}</Text>
    </View>
  );
}

function getMatchRate(history: VerificationHistoryItem[]) {
  if (history.length === 0) {
    return '0';
  }

  const matchedCount = history.filter((item) => item.status === 'matched').length;
  return String(Math.round((matchedCount / history.length) * 100));
}

function getBestConfidence(history: VerificationHistoryItem[]) {
  const matches = history.filter((item) => typeof item.confidence === 'number');

  if (matches.length === 0) {
    return '--';
  }

  const highest = Math.max(...matches.map((item) => item.confidence ?? 0));
  return `${Math.round(highest * 100)}%`;
}

function getNextActionTitle(health: BackendHealth | null, teamCount: number) {
  if (health?.services.face_recognition !== 'available') {
    return 'Confirm biometric service readiness';
  }

  if (teamCount === 0) {
    return 'Create the first team';
  }

  return 'Run a live verification flow';
}

function getNextActionDescription(health: BackendHealth | null, teamCount: number) {
  if (health?.services.face_recognition !== 'available') {
    return 'The backend must report face recognition as available before operators can trust enrollment and match actions.';
  }

  if (teamCount === 0) {
    return 'There are no teams yet. Create a team first so subteams, players, and enrollment records have somewhere to live.';
  }

  return 'The core stack is ready. Capture or choose a face image and verify the result path end to end.';
}

function getNextActionBadge(health: BackendHealth | null, teamCount: number) {
  if (health?.services.face_recognition !== 'available') {
    return 'Check backend';
  }

  if (teamCount === 0) {
    return 'Setup first';
  }

  return 'Ready to operate';
}

function getNextActionTone(health: BackendHealth | null, teamCount: number) {
  if (health?.services.face_recognition !== 'available') {
    return 'amber' as const;
  }

  if (teamCount === 0) {
    return 'sky' as const;
  }

  return 'emerald' as const;
}

function getLatestHistoryMessage(history: VerificationHistoryItem[]) {
  const latest = history[0];
  if (!latest) {
    return 'No verification attempts have been recorded on this device yet.';
  }

  return latest.message;
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
