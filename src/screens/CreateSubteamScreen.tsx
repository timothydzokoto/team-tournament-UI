import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppInput } from '../components/ui/AppInput';
import { AppScreen } from '../components/ui/AppScreen';
import { FeedbackState } from '../components/ui/FeedbackState';
import { HeroPanel } from '../components/ui/HeroPanel';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { useSession } from '../context/SessionContext';
import { ApiError } from '../services/api';
import { createSubteam, type Subteam } from '../services/subteams';

type Props = {
  teamId: number;
  teamName: string;
  onCreated: (subteam: Subteam) => void;
};

export function CreateSubteamScreen({ teamId, teamName, onCreated }: Props) {
  const { token } = useSession();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [didAttemptSubmit, setDidAttemptSubmit] = useState(false);

  const nameError = useMemo(() => {
    if (!name.trim()) {
      return 'Subteam name is required.';
    }

    return null;
  }, [name]);

  async function handleSubmit() {
    setDidAttemptSubmit(true);
    if (!token || nameError) {
      setSubmitError(nameError || 'You are not signed in.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const createdSubteam = await createSubteam(token, {
        name: name.trim(),
        description: toOptionalString(description),
        team_id: teamId,
      });
      onCreated(createdSubteam);
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
          eyebrow="Create"
          title="New subteam"
          description={`Create a subteam under ${teamName}. This is the group players will be assigned to.`}
          aside={<StatusBadge label={`Team #${teamId}`} tone="sky" />}
        />
      }>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SurfaceCard eyebrow="Subteam form" title="Create subteam record">
          <ScrollView keyboardShouldPersistTaps="handled">
            <View className="gap-4">
              <AppInput
                label="Subteam name"
                value={name}
                onChangeText={(value) => {
                  setName(value);
                  setSubmitError(null);
                }}
                placeholder="U18 Squad"
                autoCapitalize="words"
                errorText={didAttemptSubmit ? nameError : null}
                helperText="This subteam will be linked to the current team automatically."
              />
              <AppInput
                label="Description"
                value={description}
                onChangeText={setDescription}
                placeholder="Subteam purpose or age bracket"
                multiline
              />
              {submitError ? (
                <FeedbackState title="Create failed" message={submitError} tone="error" />
              ) : null}
              <AppButton
                label="Create subteam"
                onPress={handleSubmit}
                variant="primary"
                loading={submitting}
                disabled={submitting || !name.trim()}
              />
            </View>
          </ScrollView>
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

  return 'Something went wrong while creating the subteam.';
}
