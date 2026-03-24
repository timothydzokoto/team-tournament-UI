import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppInput } from '../components/ui/AppInput';
import { AppScreen } from '../components/ui/AppScreen';
import { DetailRow } from '../components/ui/DetailRow';
import { FeedbackState } from '../components/ui/FeedbackState';
import { HeroPanel } from '../components/ui/HeroPanel';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { useSession } from '../context/SessionContext';
import { ApiError } from '../services/api';
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
        setPlayers(nextPlayers);
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
    <AppScreen
      accent="violet"
      hero={
        <HeroPanel
          accent="violet"
          eyebrow="Subteam"
          title={subteamName}
          description="Open a player profile to review metadata and manage face enrollment from one place."
          aside={
            <View className="gap-3 md:items-end">
              <StatusBadge label={`Subteam #${subteamId}`} tone="violet" />
              <AppButton label="Edit subteam" onPress={onEditSubteam} variant="secondary" />
            </View>
          }
        />
      }>
      <SurfaceCard
        eyebrow="Players"
        title="Registered roster"
        action={
          <View className="flex-row gap-2">
            {token ? (
              <AppButton label="Refresh" onPress={() => loadPlayers(token)} variant="ghost" />
            ) : null}
            <AppButton label="New player" onPress={onCreatePlayer} variant="primary" />
          </View>
        }>
        <View className="mb-4 gap-3">
          <AppInput
            label="Search players"
            value={search}
            onChangeText={setSearch}
            placeholder="Search by player name, email, phone, or position"
            autoCapitalize="none"
            autoCorrect={false}
            helperText="Search runs against the backend player endpoint for this subteam."
          />
          <View className="flex-row flex-wrap gap-2">
            <AppButton
              label="All players"
              onPress={() => setFaceFilter('all')}
              variant={faceFilter === 'all' ? 'primary' : 'ghost'}
            />
            <AppButton
              label="Face uploaded"
              onPress={() => setFaceFilter('with_face')}
              variant={faceFilter === 'with_face' ? 'primary' : 'ghost'}
            />
            <AppButton
              label="Face missing"
              onPress={() => setFaceFilter('without_face')}
              variant={faceFilter === 'without_face' ? 'primary' : 'ghost'}
            />
          </View>
          <AppButton
            label={confirmDelete ? 'Cancel delete' : 'Delete subteam'}
            onPress={() => {
              setConfirmDelete((current) => !current);
              setDeleteError(null);
            }}
            variant={confirmDelete ? 'ghost' : 'danger'}
            disabled={deleting}
          />
          {confirmDelete ? (
            <View className="rounded-[24px] border border-rose-500/20 bg-rose-500/10 p-4">
              <Text className="text-xs font-medium uppercase tracking-[2px] text-rose-200">
                Confirm deletion
              </Text>
              <Text className="mt-2 text-sm leading-6 text-rose-100">
                Delete this subteam and return to the parent team. Use this only when the roster
                grouping should be removed.
              </Text>
              {deleteError ? (
                <View className="mt-3">
                  <FeedbackState title="Delete failed" message={deleteError} tone="error" />
                </View>
              ) : null}
              <View className="mt-4 gap-3">
                <AppButton
                  label="Confirm subteam deletion"
                  onPress={handleDelete}
                  variant="danger"
                  loading={deleting}
                  disabled={deleting}
                />
              </View>
            </View>
          ) : null}
        </View>
        {loading ? (
          <View className="items-center py-10">
            <ActivityIndicator color="#8b5cf6" />
            <Text className="mt-3 text-sm text-stone-400">Loading players...</Text>
          </View>
        ) : error ? (
          <FeedbackState title="Load failed" message={error} tone="error" />
        ) : visiblePlayers.length === 0 ? (
          <FeedbackState
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
      </SurfaceCard>
    </AppScreen>
  );
}

function PlayerCard({ player, onPress }: { player: Player; onPress: () => void }) {
  return (
    <View className="overflow-hidden rounded-[26px] border border-stone-800 bg-pitch">
      <View className="border-b border-stone-800 px-4 py-4">
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="text-base font-semibold text-fog">
              {player.first_name} {player.last_name}
            </Text>
            <Text className="mt-1 text-sm leading-6 text-stone-300">
              {player.position || 'Position not set'}
            </Text>
          </View>
          <StatusBadge label={`#${player.jersey_number ?? '--'}`} tone="violet" />
        </View>
      </View>

      <View className="gap-3 px-4 py-4">
        <DetailRow
          label="Email"
          value={player.email || 'No email'}
          valueTone={player.email ? 'default' : 'muted'}
        />
        <DetailRow
          label="Phone"
          value={player.phone || 'No phone'}
          valueTone={player.phone ? 'default' : 'muted'}
        />
        <DetailRow
          label="Face profile"
          value={player.face_image_url ? 'Uploaded' : 'Not uploaded'}
          valueTone={player.face_image_url ? 'positive' : 'muted'}
        />
        <AppButton label="Open player" onPress={onPress} variant="secondary" />
      </View>
    </View>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.detail;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong while loading players.';
}
