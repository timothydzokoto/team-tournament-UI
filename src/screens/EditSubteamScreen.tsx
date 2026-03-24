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
    <AppScreen
      accent="sky"
      hero={
        <HeroPanel
          accent="sky"
          eyebrow="Edit"
          title="Update subteam"
          description="Adjust the subteam label or description while keeping it linked to the current team."
          aside={<StatusBadge label={`Subteam #${subteamId}`} tone="sky" />}
        />
      }>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SurfaceCard eyebrow="Subteam form" title="Edit subteam record">
          {loading ? (
            <View className="items-center py-10">
              <ActivityIndicator color="#38bdf8" />
              <Text className="mt-3 text-sm text-stone-400">Loading subteam...</Text>
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled">
              <View className="gap-4">
                <AppInput
                  label="Subteam name"
                  value={name}
                  onChangeText={setName}
                  placeholder="U18 Squad"
                  autoCapitalize="words"
                  errorText={didAttemptSubmit ? nameError : null}
                />
                <AppInput
                  label="Description"
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Subteam purpose or age bracket"
                  multiline
                />
                {submitError ? (
                  <FeedbackState title="Update failed" message={submitError} tone="error" />
                ) : null}
                <AppButton
                  label="Save subteam"
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

  return 'Something went wrong while updating the subteam.';
}
