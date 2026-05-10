import { ReactNode, useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusBadge } from '../components/ui/StatusBadge';
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
  const [refreshing, setRefreshing] = useState(true);

  const loadHomeData = useCallback(async () => {
    if (!token) {
      return;
    }

    setRefreshing(true);

    try {
      const [teamsResult, historyResult, healthResult] = await Promise.allSettled([
        getTeams(token),
        getVerificationHistory(),
        getBackendHealth(),
      ]);

      if (teamsResult.status === 'fulfilled') {
        setTeamCount(Array.isArray(teamsResult.value) ? teamsResult.value.length : 0);
        setSnapshotError(null);
        setSnapshotConnectivityError(false);
      } else {
        setSnapshotConnectivityError(isConnectivityError(teamsResult.reason));
        setSnapshotError(
          getConnectivityMessage(
            teamsResult.reason,
            'Could not load the current operator snapshot.'
          )
        );
      }

      if (historyResult.status === 'fulfilled') {
        setHistory(historyResult.value);
      } else {
        setHistory([]);
      }

      if (healthResult.status === 'fulfilled') {
        setHealth(healthResult.value);
        setHealthError(null);
        setHealthConnectivityError(false);
      } else {
        setHealth(null);
        setHealthConnectivityError(isConnectivityError(healthResult.reason));
        setHealthError(
          getConnectivityMessage(healthResult.reason, 'Could not load backend readiness.')
        );
      }
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const backendReady =
    health?.status === 'healthy' && health.services.face_recognition === 'available';

  return (
    <SafeAreaView className="flex-1 bg-emerald-600" edges={['left', 'right']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Colored hero header */}
        <View className="px-6 pb-14 pt-10">
          <View className="absolute right-[-40px] top-[-30px] h-56 w-56 rounded-full bg-emerald-500/50" />
          <View className="absolute left-[-30px] top-16 h-36 w-36 rounded-full bg-teal-400/30" />

          <View
            className="h-14 w-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
            <Text className="text-2xl font-bold text-white">T</Text>
          </View>
          <Text className="mt-5 text-3xl font-bold text-white">Operator home</Text>
          <Text className="mt-2 text-sm leading-6 text-emerald-100">
            Manage teams, run verifications, and monitor backend readiness
            {user?.username ? ` for ${user.username}` : ''}.
          </Text>
          <View className="mt-5 flex-row flex-wrap items-center gap-3">
            <StatusBadge
              label={backendReady ? 'Backend ready' : refreshing ? 'Checking' : 'Ready'}
              tone={backendReady ? 'emerald' : 'sky'}
            />
            <Pressable
              className="items-center rounded-xl px-5 py-3"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              onPress={onOpenFaceMatch}>
              <Text className="text-sm font-semibold text-white">Verify face</Text>
            </Pressable>
          </View>
        </View>

        {/* White bottom sheet */}
        <View
          className="flex-1 rounded-t-[32px] bg-white px-6 pb-12 pt-8"
          style={{ minHeight: 560 }}>
          {/* Snapshot */}
          <Section eyebrow="Snapshot" title="Current status">
            {snapshotError ? (
              <View className="mb-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                <Text className="text-xs font-semibold uppercase tracking-wider text-red-500">
                  {snapshotConnectivityError ? 'Snapshot unavailable' : 'Snapshot issue'}
                </Text>
                <Text className="mt-1 text-sm leading-5 text-red-700">{snapshotError}</Text>
              </View>
            ) : null}
            <View className="gap-3">
              <View className="flex-row gap-3">
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
              </View>
              <View className="flex-row gap-3">
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
            </View>
          </Section>

          {/* Backend readiness */}
          <Section
            eyebrow="Backend"
            title="Service readiness"
            action={
              <Pressable
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2"
                disabled={refreshing}
                onPress={loadHomeData}>
                <Text className="text-sm font-medium text-slate-600">
                  {refreshing ? 'Refreshing' : 'Refresh'}
                </Text>
              </Pressable>
            }>
            {health ? (
              <View className="gap-3">
                <View className="flex-row gap-3">
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
                </View>
                <View className="flex-row gap-3">
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
              </View>
            ) : healthError ? (
              <View className="gap-3">
                <View className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-red-500">
                    {healthConnectivityError ? 'Backend unreachable' : 'Status unavailable'}
                  </Text>
                  <Text className="mt-1 text-sm leading-5 text-red-700">{healthError}</Text>
                </View>
                <Pressable
                  className="items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                  disabled={refreshing}
                  onPress={loadHomeData}>
                  <Text className="text-sm font-medium text-slate-600">
                    {refreshing ? 'Retrying status check' : 'Retry status check'}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <Text className="text-sm font-semibold text-slate-700">No status yet</Text>
                <Text className="mt-1 text-sm leading-5 text-slate-500">
                  Run a refresh to confirm backend readiness and biometric service availability.
                </Text>
              </View>
            )}
          </Section>

          {/* Primary workflows */}
          <Section eyebrow="Actions" title="Primary workflows">
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
          </Section>

          {/* Decision support */}
          <Section eyebrow="Decision support" title="Next best action">
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
          </Section>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow?: string;
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View className="mb-7">
      {eyebrow || title || action ? (
        <View className="mb-4 flex-row items-center justify-between gap-4">
          <View className="flex-1">
            {eyebrow ? (
              <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {eyebrow}
              </Text>
            ) : null}
            {title ? <Text className="mt-1 text-xl font-bold text-slate-800">{title}</Text> : null}
          </View>
          {action}
        </View>
      ) : null}
      {children}
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
  const barColor = {
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
    sky: 'bg-sky-500',
    violet: 'bg-violet-500',
  }[tone];
  return (
    <View className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <View className={`h-[3px] w-full ${barColor}`} />
      <View className="p-4">
        <StatusBadge label={label} tone={tone} />
        <Text className="mt-3 text-3xl font-bold text-slate-800">{value}</Text>
        <Text className="mt-1 text-xs leading-5 text-slate-500">{helper}</Text>
      </View>
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
  const barColor = {
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
    rose: 'bg-rose-500',
    sky: 'bg-sky-500',
  }[tone];
  return (
    <View className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <View className={`h-[3px] w-full ${barColor}`} />
      <View className="p-4">
        <StatusBadge label={label} tone={tone} />
        <Text className="mt-3 text-xl font-semibold capitalize text-slate-800">{value}</Text>
        <Text className="mt-1 text-xs leading-5 text-slate-500">{helper}</Text>
      </View>
    </View>
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
  const barColor = { amber: 'bg-amber-500', emerald: 'bg-emerald-500' }[tone];
  const btnClass = { amber: 'bg-amber-500', emerald: 'bg-emerald-600' }[tone];
  return (
    <View className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <View className={`h-[3px] w-full ${barColor}`} />
      <View className="p-5">
        <StatusBadge label={tone === 'amber' ? 'Verification' : 'Management'} tone={tone} />
        <Text className="mt-4 text-lg font-semibold text-slate-800">{title}</Text>
        <Text className="mt-2 text-sm leading-6 text-slate-500">{description}</Text>
        <Pressable
          className={`mt-5 items-center rounded-xl px-4 py-3 ${btnClass}`}
          onPress={onPress}>
          <Text className="text-sm font-semibold text-white">{actionLabel}</Text>
        </Pressable>
      </View>
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
  const barColor = {
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
    sky: 'bg-sky-500',
    violet: 'bg-violet-500',
  }[tone];
  return (
    <View className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <View className={`h-[3px] w-full ${barColor}`} />
      <View className="p-4">
        <StatusBadge label={badge} tone={tone} />
        <Text className="mt-3 text-base font-semibold text-slate-800">{title}</Text>
        <Text className="mt-2 text-sm leading-6 text-slate-500">{description}</Text>
      </View>
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
  if (!health) {
    return 'Confirm backend status';
  }
  if (health.services.face_recognition !== 'available') {
    return 'Confirm biometric service readiness';
  }
  if (teamCount === 0) {
    return 'Create the first team';
  }
  return 'Run a live verification flow';
}

function getNextActionDescription(health: BackendHealth | null, teamCount: number) {
  if (!health) {
    return 'Refresh backend readiness before starting the next operator workflow.';
  }
  if (health.services.face_recognition !== 'available') {
    return 'The backend must report face recognition as available before operators can trust enrollment and match actions.';
  }
  if (teamCount === 0) {
    return 'There are no teams yet. Create a team first so subteams, players, and enrollment records have somewhere to live.';
  }
  return 'The core stack is ready. Capture or choose a face image and verify the result path end to end.';
}

function getNextActionBadge(health: BackendHealth | null, teamCount: number) {
  if (!health) {
    return 'Check status';
  }
  if (health.services.face_recognition !== 'available') {
    return 'Check backend';
  }
  if (teamCount === 0) {
    return 'Setup first';
  }
  return 'Ready to operate';
}

function getNextActionTone(health: BackendHealth | null, teamCount: number) {
  if (!health) {
    return 'sky' as const;
  }
  if (health.services.face_recognition !== 'available') {
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
