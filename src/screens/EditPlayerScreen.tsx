import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Text,
  View,
} from 'react-native';

import {
  WorkflowButton,
  WorkflowFeedback,
  WorkflowInput,
  WorkflowScreen,
  WorkflowSection,
} from '../components/ui/WorkflowScreen';
import { useSession } from '../context/SessionContext';
import { ApiError } from '../services/api';
import { getPlayer, type Player, updatePlayer } from '../services/players';

type Props = {
  playerId: number;
  subteamId: number;
  onSaved: (player: Player) => void;
};

export function EditPlayerScreen({ playerId, subteamId, onSaved }: Props) {
  const { token } = useSession();
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [didAttemptSubmit, setDidAttemptSubmit] = useState(false);

  const firstNameError = useMemo(
    () => (!firstName.trim() ? 'First name is required.' : null),
    [firstName]
  );
  const lastNameError = useMemo(
    () => (!lastName.trim() ? 'Last name is required.' : null),
    [lastName]
  );

  const loadPlayer = useCallback(
    async (sessionToken: string) => {
      setLoading(true);
      setSubmitError(null);

      try {
        const player = await getPlayer(sessionToken, playerId);
        setFirstName(player.first_name);
        setLastName(player.last_name);
        setEmail(player.email ?? '');
        setPhone(player.phone ?? '');
        setPosition(player.position ?? '');
        setJerseyNumber(player.jersey_number != null ? String(player.jersey_number) : '');
        setHeight(player.height != null ? String(player.height) : '');
        setWeight(player.weight != null ? String(player.weight) : '');
        setDateOfBirth(player.date_of_birth ? player.date_of_birth.slice(0, 10) : '');
        setIsActive(player.is_active);
      } catch (error) {
        setSubmitError(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    },
    [playerId]
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    loadPlayer(token);
  }, [loadPlayer, token]);

  async function handleSubmit() {
    setDidAttemptSubmit(true);
    if (!token || firstNameError || lastNameError) {
      setSubmitError(firstNameError || lastNameError || 'You are not signed in.');
      return;
    }

    const jerseyValue = parseOptionalInteger(jerseyNumber, 'Jersey number');
    if (typeof jerseyValue === 'string') {
      setSubmitError(jerseyValue);
      return;
    }

    const heightValue = parseOptionalNumber(height, 'Height');
    if (typeof heightValue === 'string') {
      setSubmitError(heightValue);
      return;
    }

    const weightValue = parseOptionalNumber(weight, 'Weight');
    if (typeof weightValue === 'string') {
      setSubmitError(weightValue);
      return;
    }

    const birthDateValue = parseOptionalDate(dateOfBirth);
    if (typeof birthDateValue === 'string') {
      setSubmitError(birthDateValue);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const updatedPlayer = await updatePlayer(token, playerId, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: toOptionalString(email),
        phone: toOptionalString(phone),
        position: toOptionalString(position),
        jersey_number: jerseyValue,
        height: heightValue,
        weight: weightValue,
        date_of_birth: birthDateValue,
        is_active: isActive,
        subteam_id: subteamId,
      });
      onSaved(updatedPlayer);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <WorkflowScreen
      badgeLabel={`Player #${playerId}`}
      badgeTone="violet"
      title="Update player"
      description="Adjust player metadata without disturbing the face enrollment flow.">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <WorkflowSection eyebrow="Player form" title="Edit player record">
          {loading ? (
            <View className="items-center rounded-2xl border border-slate-200 bg-slate-50 py-10">
              <ActivityIndicator color="#10b981" />
              <Text className="mt-3 text-sm text-slate-500">Loading player...</Text>
            </View>
          ) : (
            <View className="gap-4">
              <View className="gap-4 md:flex-row">
                <View className="flex-1">
                  <WorkflowInput
                    label="First name"
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Ama"
                    autoCapitalize="words"
                    errorText={didAttemptSubmit ? firstNameError : null}
                  />
                </View>
                <View className="flex-1">
                  <WorkflowInput
                    label="Last name"
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Owusu"
                    autoCapitalize="words"
                    errorText={didAttemptSubmit ? lastNameError : null}
                  />
                </View>
              </View>
              <WorkflowInput
                label="Position"
                value={position}
                onChangeText={setPosition}
                placeholder="Forward"
                autoCapitalize="words"
              />
              <WorkflowInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="player@example.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
              <WorkflowInput
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                placeholder="+233 20 000 0000"
                keyboardType="phone-pad"
              />
              <View className="gap-4 md:flex-row">
                <View className="flex-1">
                  <WorkflowInput
                    label="Jersey number"
                    value={jerseyNumber}
                    onChangeText={setJerseyNumber}
                    placeholder="9"
                    keyboardType="number-pad"
                  />
                </View>
                <View className="flex-1">
                  <WorkflowInput
                    label="Height (cm)"
                    value={height}
                    onChangeText={setHeight}
                    placeholder="178"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <WorkflowInput
                label="Weight (kg)"
                value={weight}
                onChangeText={setWeight}
                placeholder="72"
                keyboardType="decimal-pad"
              />
              <WorkflowInput
                label="Date of birth"
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="2001-09-25"
                autoCapitalize="none"
                helperText="Optional. Use YYYY-MM-DD format."
              />
              <View className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <View className="flex-row items-center justify-between gap-4">
                  <View className="flex-1">
                    <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Active status
                    </Text>
                    <Text className="mt-2 text-sm leading-6 text-slate-500">
                      Keep this on for players currently active in the roster.
                    </Text>
                  </View>
                  <Switch value={isActive} onValueChange={setIsActive} thumbColor="#10b981" />
                </View>
              </View>
              {submitError ? (
                <WorkflowFeedback title="Update failed" message={submitError} tone="error" />
              ) : null}
              <WorkflowButton
                label="Save player"
                onPress={handleSubmit}
                tone="emerald"
                loading={submitting}
                disabled={submitting || !firstName.trim() || !lastName.trim()}
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

function parseOptionalInteger(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isNaN(parsed)) {
    return `${label} must be a whole number.`;
  }

  return parsed;
}

function parseOptionalNumber(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseFloat(trimmed);
  if (Number.isNaN(parsed)) {
    return `${label} must be a number.`;
  }

  return parsed;
}

function parseOptionalDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return 'Date of birth must use a valid YYYY-MM-DD value.';
  }

  return parsed.toISOString();
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.detail;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong while updating the player.';
}
