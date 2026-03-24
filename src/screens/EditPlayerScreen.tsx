import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
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
    <AppScreen
      accent="violet"
      hero={
        <HeroPanel
          accent="violet"
          eyebrow="Edit"
          title="Update player"
          description="Adjust player metadata without disturbing the face enrollment flow."
          aside={<StatusBadge label={`Player #${playerId}`} tone="violet" />}
        />
      }>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SurfaceCard eyebrow="Player form" title="Edit player record">
          {loading ? (
            <View className="items-center py-10">
              <ActivityIndicator color="#8b5cf6" />
              <Text className="mt-3 text-sm text-stone-400">Loading player...</Text>
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled">
              <View className="gap-4">
                <AppInput
                  label="First name"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Ama"
                  autoCapitalize="words"
                  errorText={didAttemptSubmit ? firstNameError : null}
                />
                <AppInput
                  label="Last name"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Owusu"
                  autoCapitalize="words"
                  errorText={didAttemptSubmit ? lastNameError : null}
                />
                <AppInput
                  label="Position"
                  value={position}
                  onChangeText={setPosition}
                  placeholder="Forward"
                  autoCapitalize="words"
                />
                <AppInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="player@example.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
                <AppInput
                  label="Phone"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+233 20 000 0000"
                  keyboardType="phone-pad"
                />
                <AppInput
                  label="Jersey number"
                  value={jerseyNumber}
                  onChangeText={setJerseyNumber}
                  placeholder="9"
                  keyboardType="number-pad"
                />
                <AppInput
                  label="Height (cm)"
                  value={height}
                  onChangeText={setHeight}
                  placeholder="178"
                  keyboardType="decimal-pad"
                />
                <AppInput
                  label="Weight (kg)"
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="72"
                  keyboardType="decimal-pad"
                />
                <AppInput
                  label="Date of birth"
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  placeholder="2001-09-25"
                  autoCapitalize="none"
                  helperText="Optional. Use YYYY-MM-DD format."
                />
                <View className="rounded-[22px] border border-stone-800 bg-pitch px-4 py-4">
                  <View className="flex-row items-center justify-between gap-4">
                    <View className="flex-1">
                      <Text className="text-xs font-medium uppercase tracking-[2px] text-stone-400">
                        Active status
                      </Text>
                      <Text className="mt-2 text-sm leading-6 text-stone-300">
                        Keep this on for players currently active in the roster.
                      </Text>
                    </View>
                    <Switch value={isActive} onValueChange={setIsActive} thumbColor="#f59e0b" />
                  </View>
                </View>
                {submitError ? (
                  <FeedbackState title="Update failed" message={submitError} tone="error" />
                ) : null}
                <AppButton
                  label="Save player"
                  onPress={handleSubmit}
                  variant="primary"
                  loading={submitting}
                  disabled={submitting || !firstName.trim() || !lastName.trim()}
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
