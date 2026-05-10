import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import {
  WorkflowButton,
  WorkflowFeedback,
  WorkflowInput,
  WorkflowScreen,
  WorkflowSection,
} from '../components/ui/WorkflowScreen';
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
    <WorkflowScreen
      badgeLabel={`Team #${teamId}`}
      badgeTone="sky"
      title="New subteam"
      description={`Create a subteam under ${teamName}. This is the group players will be assigned to.`}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <WorkflowSection eyebrow="Subteam form" title="Create subteam record">
          <View className="gap-4">
            <WorkflowInput
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
            <WorkflowInput
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="Subteam purpose or age bracket"
              multiline
            />
            {submitError ? (
              <WorkflowFeedback title="Create failed" message={submitError} tone="error" />
            ) : null}
            <WorkflowButton
              label="Create subteam"
              onPress={handleSubmit}
              tone="emerald"
              loading={submitting}
              disabled={submitting || !name.trim()}
            />
          </View>
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

  return 'Something went wrong while creating the subteam.';
}
