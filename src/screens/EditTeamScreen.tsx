import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppInput } from '../components/ui/AppInput';
import { AppScreen } from '../components/ui/AppScreen';
import { FeedbackState } from '../components/ui/FeedbackState';
import { HeroPanel } from '../components/ui/HeroPanel';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SurfaceCard } from '../components/ui/SurfaceCard';
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
    <AppScreen
      accent="emerald"
      hero={
        <HeroPanel
          accent="emerald"
          eyebrow="Edit"
          title="Update team"
          description="Adjust team identity fields without affecting the rest of the navigation flow."
          aside={<StatusBadge label={`Team #${teamId}`} tone="emerald" />}
        />
      }>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SurfaceCard eyebrow="Team form" title="Edit team record">
          {loading ? (
            <View className="items-center py-10">
              <ActivityIndicator color="#10b981" />
              <Text className="mt-3 text-sm text-stone-400">Loading team...</Text>
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled">
              <View className="gap-4">
                <AppInput
                  label="Team name"
                  value={name}
                  onChangeText={setName}
                  placeholder="Senior Eagles"
                  autoCapitalize="words"
                  errorText={didAttemptSubmit ? nameError : null}
                />
                <AppInput
                  label="Description"
                  value={description}
                  onChangeText={setDescription}
                  placeholder="High-level squad description"
                  multiline
                />
                <AppInput
                  label="Coach name"
                  value={coachName}
                  onChangeText={setCoachName}
                  placeholder="Coach A. Mensah"
                  autoCapitalize="words"
                />
                <AppInput
                  label="Logo URL"
                  value={logoUrl}
                  onChangeText={setLogoUrl}
                  placeholder="https://example.com/logo.png"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {submitError ? (
                  <FeedbackState title="Update failed" message={submitError} tone="error" />
                ) : null}
                <AppButton
                  label="Save team"
                  onPress={handleSubmit}
                  variant="primary"
                  loading={submitting}
                  disabled={submitting || !name.trim()}
                />
              </View>
            </ScrollView>
          )}
        </SurfaceCard>
      </KeyboardAvoidingView>
    </AppScreen>
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
