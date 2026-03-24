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
import { ApiError } from '../services/api';
import { getSubteams, type Subteam } from '../services/subteams';

type Props = {
  teamId: number;
  teamName: string;
  refreshKey: number;
  onCreateSubteam: () => void;
  onEditTeam: () => void;
  onDeleteTeam: () => Promise<void>;
  onOpenSubteam: (subteam: { subteamId: number; subteamName: string }) => void;
};

export function TeamDetailScreen({
  teamId,
  teamName,
  refreshKey,
  onCreateSubteam,
  onEditTeam,
  onDeleteTeam,
  onOpenSubteam,
}: Props) {
  const { token } = useSession();
  const [subteams, setSubteams] = useState<Subteam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timeoutId);
  }, [search]);

  const loadSubteams = useCallback(
    async (sessionToken: string) => {
      setLoading(true);
      setError(null);

      try {
        const nextSubteams = await getSubteams(sessionToken, teamId, debouncedSearch);
        setSubteams(nextSubteams);
      } catch (fetchError) {
        setError(getErrorMessage(fetchError));
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, teamId]
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    setDeleteError(null);
    loadSubteams(token);
  }, [debouncedSearch, loadSubteams, refreshKey, token]);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);

    try {
      await onDeleteTeam();
    } catch (deleteFetchError) {
      setDeleteError(getErrorMessage(deleteFetchError));
      setDeleting(false);
    }
  }

  return (
    <AppScreen
      accent="sky"
      hero={
        <HeroPanel
          accent="sky"
          eyebrow="Team"
          title={teamName}
          description="Choose a subteam to continue into player rosters and individual face profiles."
          aside={
            <View className="gap-3 md:items-end">
              <StatusBadge label={`Team #${teamId}`} tone="sky" />
              <AppButton label="Edit team" onPress={onEditTeam} variant="secondary" />
            </View>
          }
        />
      }>
      <SurfaceCard
        eyebrow="Subteams"
        title="Available groups"
        action={
          <View className="flex-row gap-2">
            {token ? (
              <AppButton label="Refresh" onPress={() => loadSubteams(token)} variant="ghost" />
            ) : null}
            <AppButton label="New subteam" onPress={onCreateSubteam} variant="primary" />
          </View>
        }>
        <View className="mb-4 gap-3">
          <AppInput
            label="Search subteams"
            value={search}
            onChangeText={setSearch}
            placeholder="Search by subteam name or description"
            autoCapitalize="none"
            autoCorrect={false}
            helperText="Search is scoped to this team."
          />
          <AppButton
            label={confirmDelete ? 'Cancel delete' : 'Delete team'}
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
                Delete this team and return to the teams dashboard. Use this only when you are sure
                the record should be removed.
              </Text>
              {deleteError ? (
                <View className="mt-3">
                  <FeedbackState title="Delete failed" message={deleteError} tone="error" />
                </View>
              ) : null}
              <View className="mt-4 gap-3">
                <AppButton
                  label="Confirm team deletion"
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
            <ActivityIndicator color="#38bdf8" />
            <Text className="mt-3 text-sm text-stone-400">Loading subteams...</Text>
          </View>
        ) : error ? (
          <FeedbackState title="Load failed" message={error} tone="error" />
        ) : subteams.length === 0 ? (
          <FeedbackState
            title={debouncedSearch.trim() ? 'No subteam matches' : 'No subteams yet'}
            message={
              debouncedSearch.trim()
                ? `No subteams matched "${debouncedSearch.trim()}" for this team.`
                : 'This team does not have any subteams assigned yet.'
            }
          />
        ) : (
          <View className="gap-3">
            {subteams.map((subteam) => (
              <SubteamCard
                key={subteam.id}
                subteam={subteam}
                onPress={() =>
                  onOpenSubteam({
                    subteamId: subteam.id,
                    subteamName: subteam.name,
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

function SubteamCard({ subteam, onPress }: { subteam: Subteam; onPress: () => void }) {
  return (
    <View className="overflow-hidden rounded-[26px] border border-stone-800 bg-pitch">
      <View className="border-b border-stone-800 px-4 py-4">
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="text-base font-semibold text-fog">{subteam.name}</Text>
            <Text className="mt-1 text-sm leading-6 text-stone-300">
              {subteam.description || 'No description provided.'}
            </Text>
          </View>
          <StatusBadge label={`#${subteam.id}`} tone="sky" />
        </View>
      </View>

      <View className="px-4 py-4">
        <AppButton label="Open subteam" onPress={onPress} variant="secondary" />
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

  return 'Something went wrong while loading subteams.';
}
