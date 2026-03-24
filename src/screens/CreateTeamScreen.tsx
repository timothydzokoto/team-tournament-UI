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
import { createTeam, type Team } from '../services/teams';

type Props = {
  onCreated: (team: Team) => void;
};

export function CreateTeamScreen({ onCreated }: Props) {
  const { token } = useSession();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coachName, setCoachName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [didAttemptSubmit, setDidAttemptSubmit] = useState(false);

  const nameError = useMemo(() => {
    if (!name.trim()) {
      return 'Team name is required.';
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
      const createdTeam = await createTeam(token, {
        name: name.trim(),
        description: toOptionalString(description),
        coach_name: toOptionalString(coachName),
        logo_url: toOptionalString(logoUrl),
      });
      onCreated(createdTeam);
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
          eyebrow="Create"
          title="New team"
          description="Create a top-level team first. Subteams and players can be attached after this record exists."
          aside={<StatusBadge label="Required name" tone="emerald" />}
        />
      }>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SurfaceCard eyebrow="Team form" title="Create team record">
          <ScrollView keyboardShouldPersistTaps="handled">
            <View className="gap-4">
              <AppInput
                label="Team name"
                value={name}
                onChangeText={(value) => {
                  setName(value);
                  setSubmitError(null);
                }}
                placeholder="Senior Eagles"
                autoCapitalize="words"
                errorText={didAttemptSubmit ? nameError : null}
                helperText="Use a distinct name. The backend rejects duplicates."
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
                <FeedbackState title="Create failed" message={submitError} tone="error" />
              ) : null}
              <AppButton
                label="Create team"
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

  return 'Something went wrong while creating the team.';
}
