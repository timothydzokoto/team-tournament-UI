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
import { getTeam, type Team, updateTeam } from '../services/teams';

type Props = {
  teamId: number;
  onSaved: (team: Team) => void;
};

export function EditTeamScreen({ teamId, onSaved }: Props) {
  const { token } = useSession();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coachName, setCoachName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [didAttemptSubmit, setDidAttemptSubmit] = useState(false);

  const nameError = useMemo(() => (!name.trim() ? 'Team name is required.' : null), [name]);

  const loadTeam = useCallback(
    async (sessionToken: string) => {
      setLoading(true);
      setSubmitError(null);

      try {
        const team = await getTeam(sessionToken, teamId);
        setName(team.name);
        setDescription(team.description ?? '');
        setCoachName(team.coach_name ?? '');
        setLogoUrl(team.logo_url ?? '');
      } catch (error) {
        setSubmitError(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    },
    [teamId]
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    loadTeam(token);
  }, [loadTeam, token]);

  async function handleSubmit() {
    setDidAttemptSubmit(true);
    if (!token || nameError) {
      setSubmitError(nameError || 'You are not signed in.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const updatedTeam = await updateTeam(token, teamId, {
        name: name.trim(),
        description: toOptionalString(description),
        coach_name: toOptionalString(coachName),
        logo_url: toOptionalString(logoUrl),
      });
      onSaved(updatedTeam);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <WorkflowScreen
      badgeLabel={`Team #${teamId}`}
      title="Update team"
      description="Adjust team identity fields without affecting the rest of the team flow.">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <WorkflowSection eyebrow="Team form" title="Edit team record">
          {loading ? (
            <View className="items-center rounded-2xl border border-slate-200 bg-slate-50 py-10">
              <ActivityIndicator color="#10b981" />
              <Text className="mt-3 text-sm text-slate-500">Loading team...</Text>
            </View>
          ) : (
            <View className="gap-4">
              <WorkflowInput
                label="Team name"
                value={name}
                onChangeText={setName}
                placeholder="Senior Eagles"
                autoCapitalize="words"
                errorText={didAttemptSubmit ? nameError : null}
              />
              <WorkflowInput
                label="Description"
                value={description}
                onChangeText={setDescription}
                placeholder="High-level squad description"
                multiline
              />
              <WorkflowInput
                label="Coach name"
                value={coachName}
                onChangeText={setCoachName}
                placeholder="Coach A. Mensah"
                autoCapitalize="words"
              />
              <WorkflowInput
                label="Logo URL"
                value={logoUrl}
                onChangeText={setLogoUrl}
                placeholder="https://example.com/logo.png"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {submitError ? (
                <WorkflowFeedback title="Update failed" message={submitError} tone="error" />
              ) : null}
              <WorkflowButton
                label="Save team"
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

  return 'Something went wrong while updating the team.';
}
