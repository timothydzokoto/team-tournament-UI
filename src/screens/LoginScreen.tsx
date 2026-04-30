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

export function LoginScreen({ onSwitchToSignup }: { onSwitchToSignup: () => void }) {
  const { errorMessage, signIn, submitting, clearError } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function handleLogin() {
    const success = await signIn({ username, password });
    if (success) setPassword('');
  }

  return (
    <SafeAreaView className="flex-1 bg-blue-600">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="px-6 pb-12 pt-10">
            <View className="absolute right-[-40px] top-[-30px] h-56 w-56 rounded-full bg-blue-500/50" />
            <View className="absolute left-[-30px] top-16 h-36 w-36 rounded-full bg-indigo-400/30" />

            <View
              className="h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <Text className="text-2xl font-bold text-white">T</Text>
            </View>
            <Text className="mt-5 text-3xl font-bold text-white">Welcome back</Text>
            <Text className="mt-2 text-sm leading-6 text-blue-100">
              Sign in to manage your teams, players, and verifications.
            </Text>
          </View>

          <View
            className="flex-1 rounded-t-[32px] bg-white px-6 pb-12 pt-8"
            style={{ minHeight: 480 }}>
            <Text className="text-xl font-bold text-slate-800">Sign in</Text>
            <Text className="mt-1 text-sm text-slate-400">Enter your account credentials below.</Text>

            <View className="mt-7 gap-5">
              <Field label="Username">
                <TextInput
                  autoCapitalize="none"
                  autoComplete="username"
                  autoCorrect={false}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900"
                  onChangeText={(v) => {
                    clearError();
                    setUsername(v);
                  }}
                  placeholder="Enter your username"
                  placeholderTextColor="#94a3b8"
                  returnKeyType="next"
                  textContentType="username"
                  value={username}
                />
              </Field>

              <Field label="Password">
                <TextInput
                  autoCapitalize="none"
                  autoComplete="password"
                  autoCorrect={false}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900"
                  onChangeText={(v) => {
                    clearError();
                    setPassword(v);
                  }}
                  onSubmitEditing={handleLogin}
                  placeholder="Enter your password"
                  placeholderTextColor="#94a3b8"
                  returnKeyType="go"
                  secureTextEntry
                  textContentType="password"
                  value={password}
                />
              </Field>
            </View>

            {errorMessage ? (
              <View className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                <Text className="text-xs font-semibold uppercase tracking-wider text-red-500">
                  Sign-in error
                </Text>
                <Text className="mt-1 text-sm leading-5 text-red-700">{errorMessage}</Text>
              </View>
            ) : null}

            <Pressable
              className={`mt-6 items-center rounded-xl px-4 py-4 ${submitting ? 'bg-blue-400' : 'bg-blue-600'}`}
              disabled={submitting}
              onPress={handleLogin}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-semibold text-white">Sign in</Text>
              )}
            </Pressable>

            <Pressable onPress={onSwitchToSignup} className="mt-5">
              <Text className="text-center text-sm text-slate-500">
                Don&apos;t have an account?{' '}
                <Text className="font-semibold text-blue-600">Create one</Text>
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
