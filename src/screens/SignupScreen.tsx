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

import { API_ORIGIN } from '../config/api';
import { useSession } from '../context/SessionContext';

export function SignupScreen({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { errorMessage, signUp, submitting } = useSession();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  async function handleSignup() {
    if (password !== confirmPassword) {
      // Handle password mismatch
      return;
    }
    const success = await signUp({ username, email, password });
    if (success) {
      setPassword('');
      setConfirmPassword('');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-pitch">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-5 pb-10 pt-5 md:px-8">
            <View className="absolute left-[-40px] top-12 h-40 w-40 rounded-full bg-amber-500/10" />
            <View className="absolute right-[-18px] top-44 h-28 w-28 rounded-full bg-sky-500/10" />
            <View className="absolute bottom-12 left-8 h-24 w-24 rounded-full bg-emerald-500/10" />

            <View className="mt-4 w-full max-w-[1120px] gap-5 self-center lg:flex-row">
              <View className="overflow-hidden rounded-[36px] border border-amber-500/20 bg-panel lg:flex-1">
                <View className="absolute inset-0 bg-amber-500/5" />
                <View className="px-6 py-7 md:px-8">
                  <View className="self-start rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-2">
                    <Text className="text-[11px] font-medium uppercase tracking-[2px] text-amber-300">
                      Sign up
                    </Text>
                  </View>

                  <Text className="mt-5 text-4xl font-semibold leading-[46px] text-fog">
                    Create your account to manage tournament data
                  </Text>
                  <Text className="mt-4 max-w-[620px] text-sm leading-7 text-stone-300">
                    Sign up to access the mobile console for teams, subteams, and players.
                  </Text>

                  <View className="mt-7 gap-3">
                    <StatusPanel
                      label="Connection"
                      value="Backend signup plus session creation"
                      tone="amber"
                    />
                    <StatusPanel label="API origin" value={API_ORIGIN} tone="slate" />
                    <StatusPanel
                      label="Auth flow"
                      value="/api/v1/auth/signup -> /api/v1/auth/me"
                      tone="slate"
                    />
                  </View>

                  <View className="mt-7 rounded-[28px] border border-stone-800 bg-pitch/80 p-5">
                    <View className="flex-row items-center justify-between gap-4">
                      <Text className="text-xs font-medium uppercase tracking-[2px] text-stone-400">
                        Form check
                      </Text>
                      <View className="rounded-full bg-emerald-500/15 px-3 py-2">
                        <Text className="text-[11px] font-medium uppercase tracking-[2px] text-emerald-300">
                          Valid
                        </Text>
                      </View>
                    </View>
                    <Text className="mt-3 text-sm leading-6 text-stone-300">
                      Fill in your details to create an account.
                    </Text>
                    <View className="mt-4 gap-4">
                      <TextInput
                        className="rounded-lg border border-stone-700 bg-stone-800/50 px-4 py-3 text-white"
                        placeholder="Username"
                        placeholderTextColor="#9ca3af"
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                      />
                      <TextInput
                        className="rounded-lg border border-stone-700 bg-stone-800/50 px-4 py-3 text-white"
                        placeholder="Email"
                        placeholderTextColor="#9ca3af"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                      <TextInput
                        className="rounded-lg border border-stone-700 bg-stone-800/50 px-4 py-3 text-white"
                        placeholder="Password"
                        placeholderTextColor="#9ca3af"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                      />
                      <TextInput
                        className="rounded-lg border border-stone-700 bg-stone-800/50 px-4 py-3 text-white"
                        placeholder="Confirm Password"
                        placeholderTextColor="#9ca3af"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                      />
                    </View>
                    {errorMessage && (
                      <Text className="mt-3 text-sm text-red-400">{errorMessage}</Text>
                    )}
                    <Pressable
                      className="mt-4 rounded-lg bg-amber-500 px-4 py-3"
                      onPress={handleSignup}
                      disabled={submitting}>
                      {submitting ? (
                        <ActivityIndicator color="#000" />
                      ) : (
                        <Text className="text-center font-semibold text-black">Sign Up</Text>
                      )}
                    </Pressable>
                    <Pressable onPress={onSwitchToLogin} className="mt-4">
                      <Text className="text-center text-sm text-stone-400">
                        Already have an account? <Text className="text-amber-400">Sign in</Text>
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StatusPanel({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <View className="flex-row items-center justify-between gap-4 rounded-lg border border-stone-800 bg-pitch/50 p-3">
      <Text className="text-xs font-medium uppercase tracking-[2px] text-stone-400">{label}</Text>
      <View
        className={`rounded-full px-3 py-2 ${tone === 'amber' ? 'bg-amber-500/15' : 'bg-slate-500/15'}`}>
        <Text
          className={`text-[11px] font-medium uppercase tracking-[2px] ${tone === 'amber' ? 'text-amber-300' : 'text-slate-300'}`}>
          {value}
        </Text>
      </View>
    </View>
  );
}
