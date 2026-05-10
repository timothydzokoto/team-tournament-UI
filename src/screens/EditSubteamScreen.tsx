import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import {
  WorkflowButton,
  WorkflowFeedback,
  WorkflowInput,
  WorkflowScreen,
  WorkflowSection,
} from '../components/ui/WorkflowScreen';
import { useSession } from '../context/SessionContext';
import { ApiError } from '../services/api';
import { getSubteam, type Subteam, updateSubteam } from '../services/subteams';

type Props = {
  subteamId: number;
  teamId: number;
  onSaved: (subteam: Subteam) => void;
};

export function EditSubteamScreen({ subteamId, teamId, onSaved }: Props) {
  const { token } = useSession();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [didAttemptSubmit, setDidAttemptSubmit] = useState(false);

  const nameError = useMemo(() => (!name.trim() ? 'Subteam name is required.' : null), [name]);

  const loadSubteam = useCallback(
    async (sessionToken: string) => {
      setLoading(true);
      setSubmitError(null);

      try {
        const subteam = await getSubteam(sessionToken, subteamId);
        setName(subteam.name);
        setDescription(subteam.description ?? '');
      } catch (error) {
        setSubmitError(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    },
    [subteamId]
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    loadSubteam(token);
  }, [loadSubteam, token]);

  async function handleSubmit() {
    setDidAttemptSubmit(true);
    if (!token || nameError) {
      setSubmitError(nameError || 'You are not signed in.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const updatedSubteam = await updateSubteam(token, subteamId, {
        name: name.trim(),
        description: toOptionalString(description),
        team_id: teamId,
      });
      onSaved(updatedSubteam);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <WorkflowScreen
      badgeLabel={`Subteam #${subteamId}`}
      badgeTone="sky"
      title="Update subteam"
      description="Adjust the subteam label or description while keeping it linked to the current team.">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <WorkflowSection eyebrow="Subteam form" title="Edit subteam record">
          {loading ? (
            <View className="items-center rounded-2xl border border-slate-200 bg-slate-50 py-10">
              <ActivityIndicator color="#10b981" />
              <Text className="mt-3 text-sm text-slate-500">Loading subteam...</Text>
            </View>
          ) : (
            <View className="gap-4">
              <WorkflowInput
                label="Subteam name"
                value={name}
                onChangeText={setName}
                placeholder="U18 Squad"
                autoCapitalize="words"
                errorText={didAttemptSubmit ? nameError : null}
              />
              <WorkflowInput
                label="Description"
                value={description}
                onChangeText={setDescription}
                placeholder="Subteam purpose or age bracket"
                multiline
              />
              {submitError ? (
                <WorkflowFeedback title="Update failed" message={submitError} tone="error" />
              ) : null}
              <WorkflowButton
                label="Save subteam"
                onPress={handleSubmit}
                tone="emerald"
                loading={submitting}
                disabled={submitting || !name.trim()}
              />
            </View>
          )}
        </WorkflowSection>
      </KeyboardAvoidingView>
    </WorkflowScreen>
  );
}

function toOptionalString(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.detail;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong while updating the subteam.';
}
