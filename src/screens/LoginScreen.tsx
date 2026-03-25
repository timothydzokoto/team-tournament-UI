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

export function LoginScreen({ onSwitchToSignup }: { onSwitchToSignup: () => void }) {
  const { errorMessage, signIn, submitting, clearError } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function handleLogin() {
    const success = await signIn({ username, password });
    if (success) {
      setPassword('');
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
                      Sign in
                    </Text>
                  </View>

                  <Text className="mt-5 text-4xl font-semibold leading-[46px] text-fog">
                    Manage tournament data from one focused mobile console
                  </Text>
                  <Text className="mt-4 max-w-[620px] text-sm leading-7 text-stone-300">
                    This interface talks directly to your FastAPI backend, restores saved sessions,
                    and gives you a clean path into teams, subteams, and players after sign-in.
                  </Text>

                  <View className="mt-7 gap-3">
                    <StatusPanel
                      label="Connection"
                      value="Backend login plus session restore"
                      tone="amber"
                    />
                    <StatusPanel label="API origin" value={API_ORIGIN} tone="slate" />
                    <StatusPanel
                      label="Auth flow"
                      value="/api/v1/auth/login -> /api/v1/auth/me"
                      tone="slate"
                    />
                  </View>

                  <View className="mt-7 rounded-[28px] border border-stone-800 bg-pitch/80 p-5">
                    <View className="flex-row items-center justify-between gap-4">
                      <Text className="text-xs font-medium uppercase tracking-[2px] text-stone-400">
                        Tailwind check
                      </Text>
                      <View className="rounded-full bg-emerald-500/15 px-3 py-2">
                        <Text className="text-[11px] font-medium uppercase tracking-[2px] text-emerald-300">
                          NativeWind
                        </Text>
                      </View>
                    </View>
                    <Text className="mt-3 text-sm leading-6 text-stone-300">
                      If you can see the colored chips, rounded cards, and dark layered layout
                      below, Tailwind styling is active in `src/` files.
                    </Text>
                    <View className="mt-4 flex-row flex-wrap gap-3">
                      <TailwindChip
                        label="Amber"
                        chipClassName="bg-amber-500/15"
                        textClassName="text-amber-300"
                      />
                      <TailwindChip
                        label="Sky"
                        chipClassName="bg-sky-500/15"
                        textClassName="text-sky-300"
                      />
                      <TailwindChip
                        label="Emerald"
                        chipClassName="bg-emerald-500/15"
                        textClassName="text-emerald-300"
                      />
                      <TailwindChip
                        label="Rose"
                        chipClassName="bg-rose-500/15"
                        textClassName="text-rose-300"
                      />
                    </View>
                  </View>

                  <View className="mt-5 rounded-[28px] border border-stone-800 bg-pitch/80 p-5">
                    <Text className="text-xs font-medium uppercase tracking-[2px] text-stone-400">
                      Before you sign in
                    </Text>
                    <View className="mt-4 gap-3">
                      <ChecklistItem text="Confirm the Docker backend is running on port 8000." />
                      <ChecklistItem text="Use an existing backend username and password." />
                      <ChecklistItem text="If login fails, the exact backend error will be shown below." />
                    </View>
                  </View>
                </View>
              </View>

              <View className="rounded-[36px] border border-stone-800 bg-panel px-6 py-6 lg:w-[430px]">
                <Text className="text-xs font-medium uppercase tracking-[2px] text-stone-400">
                  Account
                </Text>
                <Text className="mt-3 text-3xl font-semibold text-fog">Connect to backend</Text>
                <Text className="mt-2 text-sm leading-6 text-stone-300">
                  Sign in with a valid API account. The session is stored locally so refreshes do
                  not force another login.
                </Text>

                <View className="mt-6 gap-4">
                  <FieldLabel label="Username" />
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="username"
                    autoCorrect={false}
                    className="rounded-[22px] border border-stone-700 bg-pitch px-4 py-4 text-base text-fog"
                    onChangeText={(value) => {
                      clearError();
                      setUsername(value);
                    }}
                    placeholder="admin"
                    placeholderTextColor="#78716c"
                    returnKeyType="next"
                    textContentType="username"
                    value={username}
                  />

                  <FieldLabel label="Password" />
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="password"
                    autoCorrect={false}
                    className="rounded-[22px] border border-stone-700 bg-pitch px-4 py-4 text-base text-fog"
                    onChangeText={(value) => {
                      clearError();
                      setPassword(value);
                    }}
                    onSubmitEditing={handleLogin}
                    placeholder="password"
                    placeholderTextColor="#78716c"
                    returnKeyType="go"
                    secureTextEntry
                    textContentType="password"
                    value={password}
                  />
                </View>

                {errorMessage ? (
                  <View className="mt-4 rounded-[22px] border border-rose-500/20 bg-rose-500/10 px-4 py-3">
                    <Text className="text-xs font-medium uppercase tracking-[2px] text-rose-200">
                      Sign-in error
                    </Text>
                    <Text className="mt-2 text-sm leading-6 text-rose-100">{errorMessage}</Text>
                  </View>
                ) : (
                  <View className="mt-4 rounded-[22px] border border-stone-800 bg-pitch/80 px-4 py-3">
                    <Text className="text-sm leading-6 text-stone-400">
                      Sessions are persisted locally. On web this uses browser storage; on native it
                      uses secure device storage.
                    </Text>
                  </View>
                )}

                <Pressable
                  className={`mt-5 items-center rounded-[22px] px-4 py-4 ${
                    submitting ? 'bg-amber-500/60' : 'bg-amber-500'
                  }`}
                  disabled={submitting}
                  onPress={handleLogin}>
                  {submitting ? (
                    <ActivityIndicator color="#1c1917" />
                  ) : (
                    <Text className="text-sm font-semibold text-stone-950">Connect to backend</Text>
                  )}
                </Pressable>

                <Pressable onPress={onSwitchToSignup} className="mt-4">
                  <Text className="text-center text-sm text-stone-400">
                    Don&apos;t have an account? <Text className="text-amber-400">Sign up</Text>
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <Text className="text-xs font-medium uppercase tracking-[2px] text-stone-400">{label}</Text>
  );
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="mt-1 h-2.5 w-2.5 rounded-full bg-amber-400" />
      <Text className="flex-1 text-sm leading-6 text-stone-300">{text}</Text>
    </View>
  );
}

function StatusPanel({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'amber' | 'slate';
}) {
  const toneClasses =
    tone === 'amber' ? 'border-amber-400/20 bg-amber-500/10' : 'border-stone-800 bg-pitch/70';

  return (
    <View className={`rounded-[22px] border px-4 py-4 ${toneClasses}`}>
      <Text className="text-xs font-medium uppercase tracking-[2px] text-stone-400">{label}</Text>
      <Text className="mt-2 text-sm leading-6 text-stone-100">{value}</Text>
    </View>
  );
}

function TailwindChip({
  label,
  chipClassName,
  textClassName,
}: {
  label: string;
  chipClassName: string;
  textClassName: string;
}) {
  return (
    <View className={`rounded-full px-3 py-2 ${chipClassName}`}>
      <Text className={`text-[11px] font-medium uppercase tracking-[2px] ${textClassName}`}>
        {label}
      </Text>
    </View>
  );
}
