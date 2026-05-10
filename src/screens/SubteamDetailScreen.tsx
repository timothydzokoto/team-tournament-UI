import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { StatusBadge } from '../components/ui/StatusBadge';
import {
  WorkflowButton,
  WorkflowFeedback,
  WorkflowInput,
  WorkflowScreen,
  WorkflowSection,
} from '../components/ui/WorkflowScreen';
import { useSession } from '../context/SessionContext';
import { getConnectivityMessage } from '../services/api';
import { getPlayers, type Player } from '../services/players';

type Props = {
  subteamId: number;
  subteamName: string;
  refreshKey: number;
  onCreatePlayer: () => void;
  onEditSubteam: () => void;
  onDeleteSubteam: () => Promise<void>;
  onOpenPlayer: (player: { playerId: number; playerName: string; subteamId: number }) => void;
};

export function SubteamDetailScreen({
  subteamId,
  subteamName,
  refreshKey,
  onCreatePlayer,
  onEditSubteam,
  onDeleteSubteam,
  onOpenPlayer,
}: Props) {
  const { token } = useSession();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [faceFilter, setFaceFilter] = useState<'all' | 'with_face' | 'without_face'>('all');

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timeoutId);
  }, [search]);

  const loadPlayers = useCallback(
    async (sessionToken: string) => {
      setLoading(true);
      setError(null);

      try {
        const nextPlayers = await getPlayers(sessionToken, subteamId, debouncedSearch);
        setPlayers(Array.isArray(nextPlayers) ? nextPlayers : []);
      } catch (fetchError) {
        setError(getErrorMessage(fetchError));
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, subteamId]
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    setDeleteError(null);
    loadPlayers(token);
  }, [debouncedSearch, loadPlayers, refreshKey, token]);

  const visiblePlayers = useMemo(() => {
    if (faceFilter === 'with_face') {
      return players.filter((player) => Boolean(player.face_image_url));
    }

    if (faceFilter === 'without_face') {
      return players.filter((player) => !player.face_image_url);
    }

    return players;
  }, [faceFilter, players]);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);

    try {
      await onDeleteSubteam();
    } catch (deleteFetchError) {
      setDeleteError(getErrorMessage(deleteFetchError));
      setDeleting(false);
    }
  }

  return (
    <WorkflowScreen
      badgeLabel={`Subteam #${subteamId}`}
      badgeTone="violet"
      title={subteamName}
      description="Open a player profile to review metadata and manage face enrollment from one place."
      heroActions={
        <View className="flex-row flex-wrap gap-3">
          <WorkflowButton label="Edit subteam" onPress={onEditSubteam} />
          <WorkflowButton label="New player" onPress={onCreatePlayer} />
        </View>
      }>
      <WorkflowSection eyebrow="Actions" title="Subteam controls">
        <View className="gap-3 md:flex-row">
          <ActionCard
            title="Edit subteam"
            description="Update this subteam’s name or description."
            actionLabel="Open edit form"
            tone="sky"
            onPress={onEditSubteam}
          />
          <ActionCard
            title="Create player"
            description="Add a player to this roster before enrolling a face image."
            actionLabel="New player"
            tone="emerald"
            onPress={onCreatePlayer}
          />
        </View>
      </WorkflowSection>

      <WorkflowSection eyebrow="Players" title="Registered roster">
        <View className="mb-4 gap-3">
          <WorkflowInput
            label="Search players"
            value={search}
            onChangeText={setSearch}
            placeholder="Search by player name, email, phone, or position"
            autoCapitalize="none"
            autoCorrect={false}
            helperText="Search runs against the backend player endpoint for this subteam."
          />
          <View className="flex-row flex-wrap gap-2">
            <FilterButton
              label="All players"
              selected={faceFilter === 'all'}
              onPress={() => setFaceFilter('all')}
            />
            <FilterButton
              label="Face uploaded"
              selected={faceFilter === 'with_face'}
              onPress={() => setFaceFilter('with_face')}
            />
            <FilterButton
              label="Face missing"
              selected={faceFilter === 'without_face'}
              onPress={() => setFaceFilter('without_face')}
            />
          </View>
          <View className="flex-row flex-wrap gap-3">
            {token ? (
              <WorkflowButton
                label={loading ? 'Refreshing' : 'Refresh'}
                onPress={() => loadPlayers(token)}
                disabled={loading}
              />
            ) : null}
            <WorkflowButton label="New player" onPress={onCreatePlayer} tone="emerald" />
            <WorkflowButton
              label={confirmDelete ? 'Cancel delete' : 'Delete subteam'}
              onPress={() => {
                setConfirmDelete((current) => !current);
                setDeleteError(null);
              }}
              tone={confirmDelete ? 'neutral' : 'danger'}
              disabled={deleting}
            />
          </View>
          {confirmDelete ? (
            <View className="rounded-2xl border border-red-100 bg-red-50 p-4">
              <Text className="text-xs font-semibold uppercase tracking-wider text-red-500">
                Confirm deletion
              </Text>
              <Text className="mt-2 text-sm leading-6 text-red-700">
                Delete this subteam and return to the parent team. Use this only when the roster
                grouping should be removed.
              </Text>
              {deleteError ? (
                <View className="mt-3">
                  <WorkflowFeedback title="Delete failed" message={deleteError} tone="error" />
                </View>
              ) : null}
              <View className="mt-4">
                <WorkflowButton
                  label="Confirm subteam deletion"
                  onPress={handleDelete}
                  tone="danger"
                  loading={deleting}
                  disabled={deleting}
                />
              </View>
            </View>
          ) : null}
        </View>

        {loading ? (
          <View className="items-center rounded-2xl border border-slate-200 bg-slate-50 py-10">
            <ActivityIndicator color="#10b981" />
            <Text className="mt-3 text-sm text-slate-500">Loading players...</Text>
          </View>
        ) : error ? (
          <View className="gap-3">
            <WorkflowFeedback
              title={isConnectivityErrorMessage(error) ? 'Roster unavailable' : 'Load failed'}
              message={error}
              tone="error"
            />
            {token ? (
              <WorkflowButton label="Retry player load" onPress={() => loadPlayers(token)} />
            ) : null}
          </View>
        ) : visiblePlayers.length === 0 ? (
          <WorkflowFeedback
            title={
              debouncedSearch.trim() || faceFilter !== 'all'
                ? 'No player matches'
                : 'No players yet'
            }
            message={
              debouncedSearch.trim() || faceFilter !== 'all'
                ? 'No players match the current search and filter settings.'
                : 'No players were returned for this subteam yet.'
            }
          />
        ) : (
          <View className="gap-3">
            {visiblePlayers.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                onPress={() =>
                  onOpenPlayer({
                    playerId: player.id,
                    playerName: `${player.first_name} ${player.last_name}`,
                    subteamId: player.subteam_id,
                  })
                }
              />
            ))}
          </View>
        )}
      </WorkflowSection>
    </WorkflowScreen>
  );
}

function ActionCard({
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
  tone: 'emerald' | 'sky';
}) {
  const barColor = { emerald: 'bg-emerald-500', sky: 'bg-sky-500' }[tone];
  const buttonTone = tone === 'emerald' ? 'emerald' : 'neutral';

  return (
    <View className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <View className={`h-[3px] w-full ${barColor}`} />
      <View className="p-5">
        <StatusBadge label={tone === 'emerald' ? 'Roster' : 'Management'} tone={tone} />
        <Text className="mt-4 text-lg font-semibold text-slate-800">{title}</Text>
        <Text className="mt-2 text-sm leading-6 text-slate-500">{description}</Text>
        <View className="mt-5">
          <WorkflowButton label={actionLabel} onPress={onPress} tone={buttonTone} />
        </View>
      </View>
    </View>
  );
}

function FilterButton({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return <WorkflowButton label={label} onPress={onPress} tone={selected ? 'emerald' : 'neutral'} />;
}

function PlayerCard({ player, onPress }: { player: Player; onPress: () => void }) {
  return (
    <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <View className="h-[3px] w-full bg-violet-500" />
      <View className="p-4">
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="text-base font-semibold text-slate-800">
              {player.first_name} {player.last_name}
            </Text>
            <Text className="mt-1 text-sm leading-6 text-slate-500">
              {player.position || 'Position not set'}
            </Text>
          </View>
          <StatusBadge label={`#${player.jersey_number ?? '--'}`} tone="violet" />
        </View>

        <View className="mt-4 gap-3">
          <DetailField label="Email" value={player.email || 'No email'} muted={!player.email} />
          <DetailField label="Phone" value={player.phone || 'No phone'} muted={!player.phone} />
          <DetailField
            label="Face profile"
            value={player.face_image_url ? 'Uploaded' : 'Not uploaded'}
            positive={Boolean(player.face_image_url)}
            muted={!player.face_image_url}
          />
          <WorkflowButton label="Open player" onPress={onPress} tone="emerald" />
        </View>
      </View>
    </View>
  );
}

function DetailField({
  label,
  muted,
  positive,
  value,
}: {
  label: string;
  muted?: boolean;
  positive?: boolean;
  value: string;
}) {
  const valueClass = positive ? 'text-emerald-600' : muted ? 'text-slate-400' : 'text-slate-700';

  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className="text-xs uppercase tracking-[1px] text-slate-400">{label}</Text>
      <Text className={`text-sm ${valueClass}`}>{value}</Text>
    </View>
  );
}

function getErrorMessage(error: unknown) {
  return getConnectivityMessage(error, 'Something went wrong while loading players.');
}

function isConnectivityErrorMessage(message: string) {
  return message.includes('Could not reach') || message.includes('timed out');
}
