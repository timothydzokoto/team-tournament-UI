import { useCallback, useEffect, useState } from 'react';
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
        setSubteams(Array.isArray(nextSubteams) ? nextSubteams : []);
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
    <WorkflowScreen
      badgeLabel={`Team #${teamId}`}
      badgeTone="sky"
      title={teamName}
      description="Manage this team’s subteams and team-level actions from one focused view."
      heroActions={
        <View className="flex-row flex-wrap gap-3">
          <HeroButton label="Edit team" onPress={onEditTeam} />
          <HeroButton label="New subteam" onPress={onCreateSubteam} />
        </View>
      }>
      <WorkflowSection eyebrow="Actions" title="Team controls">
        <View className="gap-3 md:flex-row">
          <View className="flex-1">
            <ActionCard
              title="Edit team"
              description="Update the team name, description, coach, or logo URL."
              actionLabel="Open edit form"
              tone="emerald"
              onPress={onEditTeam}
            />
          </View>
          <View className="flex-1">
            <ActionCard
              title="Create subteam"
              description="Add a group under this team before adding player rosters."
              actionLabel="New subteam"
              tone="sky"
              onPress={onCreateSubteam}
            />
          </View>
        </View>
      </WorkflowSection>

      <WorkflowSection eyebrow="Subteams" title="Available groups">
        <View className="mb-4 gap-3">
          <WorkflowInput
            label="Search subteams"
            value={search}
            onChangeText={setSearch}
            placeholder="Search by subteam name or description"
            autoCapitalize="none"
            autoCorrect={false}
            helperText="Search is scoped to this team."
          />
          <View className="flex-row flex-wrap gap-3">
            {token ? (
              <WorkflowButton
                label={loading ? 'Refreshing' : 'Refresh'}
                onPress={() => loadSubteams(token)}
                disabled={loading}
              />
            ) : null}
            <WorkflowButton label="New subteam" onPress={onCreateSubteam} tone="emerald" />
            <WorkflowButton
              label={confirmDelete ? 'Cancel delete' : 'Delete team'}
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
                Delete this team and return to the teams dashboard. Use this only when the record
                should be removed.
              </Text>
              {deleteError ? (
                <View className="mt-3">
                  <WorkflowFeedback title="Delete failed" message={deleteError} tone="error" />
                </View>
              ) : null}
              <View className="mt-4">
                <WorkflowButton
                  label="Confirm team deletion"
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
            <Text className="mt-3 text-sm text-slate-500">Loading subteams...</Text>
          </View>
        ) : error ? (
          <View className="gap-3">
            <WorkflowFeedback
              title={isConnectivityErrorMessage(error) ? 'Subteams unavailable' : 'Load failed'}
              message={error}
              tone="error"
            />
            {token ? (
              <WorkflowButton label="Retry subteam load" onPress={() => loadSubteams(token)} />
            ) : null}
          </View>
        ) : subteams.length === 0 ? (
          <WorkflowFeedback
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
      </WorkflowSection>
    </WorkflowScreen>
  );
}

function HeroButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <WorkflowButton label={label} onPress={onPress} tone="neutral" />;
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
    <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <View className={`h-[3px] w-full ${barColor}`} />
      <View className="p-5">
        <StatusBadge label={tone === 'emerald' ? 'Management' : 'Setup'} tone={tone} />
        <Text className="mt-4 text-lg font-semibold text-slate-800">{title}</Text>
        <Text className="mt-2 text-sm leading-6 text-slate-500">{description}</Text>
        <View className="mt-5">
          <WorkflowButton label={actionLabel} onPress={onPress} tone={buttonTone} />
        </View>
      </View>
    </View>
  );
}

function SubteamCard({ subteam, onPress }: { subteam: Subteam; onPress: () => void }) {
  return (
    <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <View className="h-[3px] w-full bg-sky-500" />
      <View className="p-4">
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="text-base font-semibold text-slate-800">{subteam.name}</Text>
            <Text className="mt-1 text-sm leading-6 text-slate-500">
              {subteam.description || 'No description provided.'}
            </Text>
          </View>
          <StatusBadge label={`#${subteam.id}`} tone="sky" />
        </View>

        <View className="mt-4">
          <WorkflowButton label="Open subteam" onPress={onPress} tone="emerald" />
        </View>
      </View>
    </View>
  );
}

function getErrorMessage(error: unknown) {
  return getConnectivityMessage(error, 'Something went wrong while loading subteams.');
}

function isConnectivityErrorMessage(message: string) {
  return message.includes('Could not reach') || message.includes('timed out');
}
