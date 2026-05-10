import { ReactNode, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusBadge } from '../components/ui/StatusBadge';
import { useSession } from '../context/SessionContext';
import { getConnectivityMessage } from '../services/api';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  }, [loadTeams, refreshKey, token]);

  async function loadHistory() {
    const nextHistory = await getVerificationHistory();
    setHistory(nextHistory);
  }

  return (
    <SafeAreaView className="flex-1 bg-emerald-600" edges={['left', 'right']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 pb-14 pt-10">
          <View className="absolute right-[-40px] top-[-30px] h-56 w-56 rounded-full bg-emerald-500/50" />
          <View className="absolute left-[-30px] top-16 h-36 w-36 rounded-full bg-teal-400/30" />

          <View
            className="h-14 w-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
            <Text className="text-2xl font-bold text-white">T</Text>
          </View>
          <Text className="mt-5 text-3xl font-bold text-white">Teams dashboard</Text>
          <Text className="mt-2 text-sm leading-6 text-emerald-100">
            Start with a team, then manage subteams, rosters, and player enrollment
            {user?.username ? ` for ${user.username}` : ''}.
          </Text>
          <View className="mt-5 flex-row flex-wrap items-center gap-3">
            <StatusBadge label="Teams" tone="emerald" />
            <HeaderButton label="New team" onPress={onCreateTeam} />
            <HeaderButton label="Verify face" onPress={onOpenFaceMatch} />
            <HeaderButton label="Log out" onPress={signOut} />
          </View>
        </View>

        <View
          className="flex-1 rounded-t-[32px] bg-white px-6 pb-12 pt-8"
          style={{ minHeight: 680 }}>
          <Section eyebrow="Actions" title="Common operations">
            <View className="gap-3 md:flex-row">
              <QuickActionCard
                title="Create team"
                description="Add a top-level team before managing subteams and players."
                actionLabel="Open team form"
                tone="emerald"
                onPress={onCreateTeam}
              />
              <QuickActionCard
                title="Verify face"
                description="Capture or choose an image and run backend face matching."
                actionLabel="Open face match"
                tone="amber"
                onPress={onOpenFaceMatch}
              />
            </View>
          </Section>

          <Section eyebrow="Teams" title="Available squads">
            <View className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Search teams
              </Text>
              <TextInput
                className="mt-2 text-base text-slate-800"
                value={search}
                onChangeText={setSearch}
                placeholder="Search by team name or description"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text className="mt-2 text-xs leading-5 text-slate-500">
                Search runs against the backend team endpoint.
              </Text>
            </View>

            <View className="mb-4 flex-row flex-wrap gap-3">
              {token ? (
                <Pressable
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                  disabled={loading}
                  onPress={() => loadTeams(token)}>
                  <Text className="text-sm font-medium text-slate-600">
                    {loading ? 'Refreshing' : 'Refresh teams'}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable className="rounded-xl bg-emerald-600 px-4 py-3" onPress={onCreateTeam}>
                <Text className="text-sm font-semibold text-white">New team</Text>
              </Pressable>
            </View>

            {loading ? (
              <View className="items-center rounded-2xl border border-slate-200 bg-slate-50 py-10">
                <ActivityIndicator color="#10b981" />
                <Text className="mt-3 text-sm text-slate-500">Loading teams...</Text>
              </View>
            ) : error ? (
              <View className="gap-3">
                <FeedbackBox
                  title={isConnectivityErrorMessage(error) ? 'Teams unavailable' : 'Load failed'}
                  message={error}
                  tone="error"
                />
                {token ? (
                  <Pressable
                    className="items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                    onPress={() => loadTeams(token)}>
                    <Text className="text-sm font-medium text-slate-600">Retry team load</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : teams.length === 0 ? (
              <FeedbackBox
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
          </Section>

          <Section eyebrow="Recent activity" title="Verification history">
            {history.length === 0 ? (
              <FeedbackBox
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
          </Section>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function HeaderButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      className="items-center rounded-xl px-5 py-3"
      style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
      onPress={onPress}>
      <Text className="text-sm font-semibold text-white">{label}</Text>
    </Pressable>
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

function FeedbackBox({
  message,
  title,
  tone = 'empty',
}: {
  message: string;
  title: string;
  tone?: 'empty' | 'error';
}) {
  const style =
    tone === 'error'
      ? 'border-red-100 bg-red-50 text-red-700'
      : 'border-slate-200 bg-slate-50 text-slate-500';
  const titleClass = tone === 'error' ? 'text-red-500' : 'text-slate-500';

  return (
    <View className={`rounded-xl border px-4 py-3 ${style}`}>
      <Text className={`text-xs font-semibold uppercase tracking-wider ${titleClass}`}>
        {title}
      </Text>
      <Text
        className={`mt-1 text-sm leading-5 ${tone === 'error' ? 'text-red-700' : 'text-slate-500'}`}>
        {message}
      </Text>
    </View>
  );
}

function TeamCard({ team, onPress }: { team: Team; onPress: () => void }) {
  return (
    <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <View className="h-[3px] w-full bg-emerald-500" />
      <View className="p-4">
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="text-base font-semibold text-slate-800">{team.name}</Text>
            <Text className="mt-1 text-sm leading-6 text-slate-500">
              {team.description || 'No description provided.'}
            </Text>
          </View>
          <StatusBadge label={`#${team.id}`} tone="amber" />
        </View>

        <View className="mt-4 flex-row items-center justify-between gap-4">
          <Text className="text-xs uppercase tracking-[1px] text-slate-400">Coach</Text>
          <Text className="text-sm text-slate-600">{team.coach_name || 'Unassigned'}</Text>
        </View>

        <Pressable
          className="mt-4 items-center rounded-xl bg-emerald-600 px-4 py-3"
          onPress={onPress}>
          <Text className="text-sm font-semibold text-white">Open team</Text>
        </Pressable>
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
        <StatusBadge label={tone === 'amber' ? 'Verification' : 'Setup'} tone={tone} />
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
    <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <View
        className={`h-[3px] w-full ${tone === 'rose' ? 'bg-rose-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'}`}
      />
      <View className="p-4">
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="text-sm font-semibold text-slate-800">{getHistoryTitle(item)}</Text>
            <Text className="mt-2 text-sm leading-6 text-slate-500">{item.message}</Text>
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
          <Pressable
            className="mt-4 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
            onPress={onOpenPlayer}>
            <Text className="text-sm font-medium text-slate-600">Open matched player</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function HistoryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className="text-xs uppercase tracking-[1px] text-slate-400">{label}</Text>
      <Text className="text-sm text-slate-600">{value}</Text>
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

function getErrorMessage(error: unknown) {
  return getConnectivityMessage(error, 'Something went wrong while loading teams.');
}

function isConnectivityErrorMessage(message: string) {
  return message.includes('Could not reach') || message.includes('timed out');
}
