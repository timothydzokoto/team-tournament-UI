import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '../context/SessionContext';

export function SignupScreen({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { errorMessage, signUp, submitting, clearError } = useSession();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  function clearErrors() {
    clearError();
    setLocalError(null);
  }

  async function handleSignup() {
    setLocalError(null);
    if (!username.trim() || !email.trim() || !password) {
      setLocalError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }
    const success = await signUp({ username, email, password });
    if (success) {
      setPassword('');
      setConfirmPassword('');
    }
  }

  const displayError = localError ?? errorMessage;

  return (
    <SafeAreaView className="flex-1 bg-indigo-600">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="px-6 pb-12 pt-10">
            <View className="absolute right-[-40px] top-[-30px] h-56 w-56 rounded-full bg-indigo-500/50" />
            <View className="absolute left-[-30px] top-16 h-36 w-36 rounded-full bg-purple-400/30" />

            <View
              className="h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <Text className="text-2xl font-bold text-white">T</Text>
            </View>
            <Text className="mt-5 text-3xl font-bold text-white">Create account</Text>
            <Text className="mt-2 text-sm leading-6 text-indigo-100">
              Set up your account to start managing tournament data.
            </Text>
          </View>

          <View
            className="flex-1 rounded-t-[32px] bg-white px-6 pb-12 pt-8"
            style={{ minHeight: 560 }}>
            <Text className="text-xl font-bold text-slate-800">Sign up</Text>
            <Text className="mt-1 text-sm text-slate-400">Fill in the details below to get started.</Text>

            <View className="mt-7 gap-5">
              <Field label="Username">
                <TextInput
                  autoCapitalize="none"
                  autoComplete="username"
                  autoCorrect={false}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900"
                  onChangeText={(v) => {
                    clearErrors();
                    setUsername(v);
                  }}
                  placeholder="Choose a username"
                  placeholderTextColor="#94a3b8"
                  returnKeyType="next"
                  textContentType="username"
                  value={username}
                />
              </Field>

              <Field label="Email">
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  keyboardType="email-address"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900"
                  onChangeText={(v) => {
                    clearErrors();
                    setEmail(v);
                  }}
                  placeholder="your@email.com"
                  placeholderTextColor="#94a3b8"
                  returnKeyType="next"
                  textContentType="emailAddress"
                  value={email}
                />
              </Field>

              <Field label="Password">
                <TextInput
                  autoCapitalize="none"
                  autoComplete="new-password"
                  autoCorrect={false}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900"
                  onChangeText={(v) => {
                    clearErrors();
                    setPassword(v);
                  }}
                  placeholder="Create a password"
                  placeholderTextColor="#94a3b8"
                  returnKeyType="next"
                  secureTextEntry
                  textContentType="newPassword"
                  value={password}
                />
              </Field>

              <Field label="Confirm password">
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900"
                  onChangeText={(v) => {
                    clearErrors();
                    setConfirmPassword(v);
                  }}
                  onSubmitEditing={handleSignup}
                  placeholder="Repeat your password"
                  placeholderTextColor="#94a3b8"
                  returnKeyType="go"
                  secureTextEntry
                  textContentType="newPassword"
                  value={confirmPassword}
                />
              </Field>
            </View>

            {displayError ? (
              <View className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                <Text className="text-xs font-semibold uppercase tracking-wider text-red-500">
                  Error
                </Text>
                <Text className="mt-1 text-sm leading-5 text-red-700">{displayError}</Text>
              </View>
            ) : null}

            <Pressable
              className={`mt-6 items-center rounded-xl px-4 py-4 ${submitting ? 'bg-indigo-400' : 'bg-indigo-600'}`}
              disabled={submitting}
              onPress={handleSignup}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-semibold text-white">Create account</Text>
              )}
            </Pressable>

            <Pressable onPress={onSwitchToLogin} className="mt-5">
              <Text className="text-center text-sm text-slate-500">
                Already have an account?{' '}
                <Text className="font-semibold text-indigo-600">Sign in</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</Text>
      {children}
    </View>
  );
}
