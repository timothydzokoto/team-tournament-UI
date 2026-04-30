import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppInput } from '../components/ui/AppInput';
import { AppScreen } from '../components/ui/AppScreen';
import { FeedbackState } from '../components/ui/FeedbackState';
import { HeroPanel } from '../components/ui/HeroPanel';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { useSession } from '../context/SessionContext';
import { getConnectivityMessage, isConnectivityError } from '../services/api';
import { getBackendHealth, type BackendHealth } from '../services/health';
import { getTeams, type Team } from '../services/teams';
import {
  getVerificationHistory,
  type VerificationHistoryItem,
} from '../services/verification-history';

type Props = {
  refreshKey: number;
  onCreateTeam: () => void;
  onOpenFaceMatch: () => void;
  onOpenMatchedPlayer: (player: {
    playerId: number;
    playerName: string;
    subteamId?: number;
  }) => void;
  onOpenTeam: (team: { teamId: number; teamName: string }) => void;
};

export function DashboardScreen({
  onCreateTeam,
  onOpenFaceMatch,
  onOpenMatchedPlayer,
  onOpenTeam,
  refreshKey,
}: Props) {
  const { token, user, signOut } = useSession();
  const [teams, setTeams] = useState<Team[]>([]);
  const [history, setHistory] = useState<VerificationHistoryItem[]>([]);
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthConnectivityError, setHealthConnectivityError] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timeoutId);
  }, [search]);

  const loadTeams = useCallback(
    async (sessionToken: string) => {
      setLoading(true);
      setError(null);

      try {
        const nextTeams = await getTeams(sessionToken, debouncedSearch);
        setTeams(Array.isArray(nextTeams) ? nextTeams : []);
      } catch (fetchError) {
        setError(getErrorMessage(fetchError));
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch]
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    loadTeams(token);
    loadHistory();
    loadHealth();
  }, [loadTeams, refreshKey, token]);

  async function loadHistory() {
    const nextHistory = await getVerificationHistory();
    setHistory(nextHistory);
  }

  async function loadHealth() {
    try {
      const nextHealth = await getBackendHealth();
      setHealth(nextHealth);
      setHealthError(null);
      setHealthConnectivityError(false);
    } catch (healthFetchError) {
      setHealth(null);
      setHealthConnectivityError(isConnectivityError(healthFetchError));
      setHealthError(getConnectivityMessage(healthFetchError, 'Could not load backend readiness.'));
    }
  }

  return (
    <AppScreen
      accent="emerald"
      hero={
        <HeroPanel
          accent="emerald"
          eyebrow="Session"
          title="Teams dashboard"
          description={`Signed in as ${user?.username}. Start with a team, then drill into subteams and player profiles from the same flow.`}
          aside={
            <View className="gap-3 md:items-end">
              <StatusBadge label="Backend live" tone="emerald" />
              <AppButton label="Face match" onPress={onOpenFaceMatch} variant="primary" />
              <AppButton label="Log out" onPress={signOut} variant="secondary" />
            </View>
          }
        />
      }>
      <SurfaceCard
        eyebrow="Backend"
        title="Service readiness"
        action={<AppButton label="Check status" onPress={loadHealth} variant="secondary" />}>
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
              title={healthConnectivityError ? 'Backend unreachable' : 'Health check failed'}
              message={healthError}
              tone="error"
            />
            <AppButton label="Retry health check" onPress={loadHealth} variant="secondary" />
          </View>
        ) : (
          <FeedbackState
            title="No health data"
            message="Run a backend status check to confirm face recognition and infrastructure readiness."
          />
        )}
      </SurfaceCard>

      <SurfaceCard eyebrow="Snapshot" title="Operational summary">
        <View className="gap-3 md:flex-row">
          <SummaryTile
            label="Teams"
            value={String(teams.length)}
            helper={debouncedSearch.trim() ? 'matching current search' : 'currently visible'}
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

      <SurfaceCard eyebrow="Quick actions" title="Common operations">
        <View className="gap-3 md:flex-row">
          <QuickActionCard
            title="Verify face"
            description="Capture or choose an image and run backend face matching."
            actionLabel="Open face match"
            tone="amber"
            onPress={onOpenFaceMatch}
          />
          <QuickActionCard
            title="Create team"
            description="Add a top-level team before managing subteams and players."
            actionLabel="Open team form"
            tone="emerald"
            onPress={onCreateTeam}
          />
        </View>
      </SurfaceCard>

      <SurfaceCard eyebrow="Operator focus" title="Current working context">
        <View className="gap-3 md:flex-row">
          <FocusTile
            label="Search scope"
            value={debouncedSearch.trim() ? debouncedSearch.trim() : 'All teams'}
            helper={
              debouncedSearch.trim()
                ? 'The list below is filtered against backend search results.'
                : 'No team filter is active right now.'
            }
            tone="sky"
          />
          <FocusTile
            label="Latest biometric event"
            value={history[0] ? getHistoryBadge(history[0]) : 'No activity'}
            helper={
              history[0]
                ? history[0].message
                : 'Run face verification to populate operator activity.'
            }
            tone={
              history[0]?.status === 'matched'
                ? 'emerald'
                : history[0]?.status === 'no_match'
                  ? 'amber'
                  : 'violet'
            }
          />
        </View>
      </SurfaceCard>

      <SurfaceCard eyebrow="Recent activity" title="Verification history">
        {history.length === 0 ? (
          <FeedbackState
            title="No verification history"
            message="Face match attempts on this device will appear here after you run them."
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

      <SurfaceCard
        eyebrow="Teams"
        title="Available squads"
        action={
          <View className="flex-row gap-2">
            {token ? (
              <AppButton label="Refresh" onPress={() => loadTeams(token)} variant="ghost" />
            ) : null}
            <AppButton label="New team" onPress={onCreateTeam} variant="primary" />
          </View>
        }>
        <View className="mb-4">
          <AppInput
            label="Search teams"
            value={search}
            onChangeText={setSearch}
            placeholder="Search by team name or description"
            autoCapitalize="none"
            autoCorrect={false}
            helperText="Search runs against the backend team endpoint."
          />
        </View>
        {loading ? (
          <View className="items-center py-10">
            <ActivityIndicator color="#10b981" />
            <Text className="mt-3 text-sm text-stone-400">Loading teams...</Text>
          </View>
        ) : error ? (
          <View className="gap-3">
            <FeedbackState
              title={isConnectivityErrorMessage(error) ? 'Teams unavailable' : 'Load failed'}
              message={error}
              tone="error"
            />
            {token ? (
              <AppButton
                label="Retry team load"
                onPress={() => loadTeams(token)}
                variant="secondary"
              />
            ) : null}
          </View>
        ) : teams.length === 0 ? (
          <FeedbackState
            title={debouncedSearch.trim() ? 'No team matches' : 'No teams yet'}
            message={
              debouncedSearch.trim()
                ? `No teams matched "${debouncedSearch.trim()}".`
                : 'No teams were returned by the backend yet.'
            }
          />
        ) : (
          <View className="gap-3">
            {teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                onPress={() => onOpenTeam({ teamId: team.id, teamName: team.name })}
              />
            ))}
          </View>
        )}
      </SurfaceCard>
    </AppScreen>
  );
}

function TeamCard({ team, onPress }: { team: Team; onPress: () => void }) {
  return (
    <View className="overflow-hidden rounded-[26px] border border-stone-800 bg-pitch">
      <View className="border-b border-stone-800 px-4 py-4">
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="text-base font-semibold text-fog">{team.name}</Text>
            <Text className="mt-1 text-sm leading-6 text-stone-300">
              {team.description || 'No description provided.'}
            </Text>
          </View>
          <StatusBadge label={`#${team.id}`} tone="amber" />
        </View>
      </View>

      <View className="gap-3 px-4 py-4">
        <View className="flex-row items-center justify-between gap-4">
          <Text className="text-xs uppercase tracking-[1px] text-stone-500">Coach</Text>
          <Text className="text-sm text-stone-200">{team.coach_name || 'Unassigned'}</Text>
        </View>
        <AppButton label="Open team" onPress={onPress} variant="secondary" />
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
  return (
    <View className="flex-1 rounded-[26px] border border-line bg-panelRaised p-4">
      <StatusBadge label={tone === 'amber' ? 'Verification' : 'Setup'} tone={tone} />
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

function FocusTile({
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
      <Text className="mt-4 text-2xl font-semibold text-stone-50">{value}</Text>
      <Text className="mt-2 text-sm leading-6 text-mist">{helper}</Text>
    </View>
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

function getErrorMessage(error: unknown) {
  return getConnectivityMessage(error, 'Something went wrong while loading teams.');
}

function isConnectivityErrorMessage(message: string) {
  return message.includes('Could not reach') || message.includes('timed out');
}
