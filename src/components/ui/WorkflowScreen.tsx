import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusBadge } from './StatusBadge';

type WorkflowScreenProps = {
  badgeLabel: string;
  badgeTone?: 'amber' | 'emerald' | 'rose' | 'sky' | 'violet' | 'slate';
  children: ReactNode;
  description: string;
  heroActions?: ReactNode;
  title: string;
};

export function WorkflowScreen({
  badgeLabel,
  badgeTone = 'emerald',
  children,
  description,
  heroActions,
  title,
}: WorkflowScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-emerald-600" edges={['left', 'right']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 pb-14 pt-10">
          <View className="absolute right-[-40px] top-[-30px] h-56 w-56 rounded-full bg-emerald-500/50" />
          <View className="absolute left-[-30px] top-16 h-36 w-36 rounded-full bg-teal-400/30" />

          <View
            className="h-14 w-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
            <Text className="text-2xl font-bold text-white">T</Text>
          </View>
          <Text className="mt-5 text-3xl font-bold text-white">{title}</Text>
          <Text className="mt-2 text-sm leading-6 text-emerald-100">{description}</Text>
          <View className="mt-5 flex-row flex-wrap items-center gap-3">
            <StatusBadge label={badgeLabel} tone={badgeTone} />
            {heroActions}
          </View>
        </View>

        <View
          className="flex-1 rounded-t-[32px] bg-white px-6 pb-12 pt-8"
          style={{ minHeight: 620 }}>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function WorkflowSection({
  action,
  children,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  eyebrow?: string;
  title?: string;
}) {
  return (
    <View className="mb-7">
      {eyebrow || title || action ? (
        <View className="mb-4 flex-row items-center justify-between gap-4">
          <View className="flex-1">
            {eyebrow ? (
              <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {eyebrow}
              </Text>
            ) : null}
            {title ? <Text className="mt-1 text-xl font-bold text-slate-800">{title}</Text> : null}
          </View>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

type WorkflowButtonProps = {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
  tone?: 'amber' | 'danger' | 'emerald' | 'neutral';
};

export function WorkflowButton({
  disabled,
  label,
  loading,
  onPress,
  tone = 'neutral',
}: WorkflowButtonProps) {
  const className = {
    amber: 'bg-amber-500',
    danger: 'bg-rose-500',
    emerald: 'bg-emerald-600',
    neutral: 'border border-slate-200 bg-slate-50',
  }[tone];
  const textClassName = tone === 'neutral' ? 'text-slate-600' : 'text-white';

  return (
    <Pressable
      className={`items-center justify-center rounded-xl px-4 py-3 ${className}`}
      disabled={disabled || loading}
      style={{ opacity: disabled || loading ? 0.65 : 1 }}
      onPress={onPress}>
      {loading ? (
        <ActivityIndicator color={tone === 'neutral' ? '#475569' : '#ffffff'} />
      ) : (
        <Text className={`text-sm font-semibold ${textClassName}`}>{label}</Text>
      )}
    </Pressable>
  );
}

type WorkflowInputProps = TextInputProps & {
  errorText?: string | null;
  helperText?: string;
  label: string;
  multiline?: boolean;
};

export function WorkflowInput({
  errorText,
  helperText,
  label,
  multiline,
  ...props
}: WorkflowInputProps) {
  return (
    <View>
      <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</Text>
      <View
        className={`mt-2 rounded-2xl border bg-slate-50 px-4 ${
          errorText ? 'border-red-200' : 'border-slate-200'
        } ${multiline ? 'py-3' : 'py-1'}`}>
        <TextInput
          className="text-base text-slate-800"
          multiline={multiline}
          placeholderTextColor="#94a3b8"
          textAlignVertical={multiline ? 'top' : 'center'}
          style={{ minHeight: multiline ? 96 : 44 }}
          {...props}
        />
      </View>
      {errorText ? (
        <Text className="mt-2 text-xs leading-5 text-red-600">{errorText}</Text>
      ) : helperText ? (
        <Text className="mt-2 text-xs leading-5 text-slate-500">{helperText}</Text>
      ) : null}
    </View>
  );
}

export function WorkflowFeedback({
  message,
  title,
  tone = 'empty',
}: {
  message: string;
  title: string;
  tone?: 'empty' | 'error' | 'success';
}) {
  const boxClass = {
    empty: 'border-slate-200 bg-slate-50',
    error: 'border-red-100 bg-red-50',
    success: 'border-emerald-100 bg-emerald-50',
  }[tone];
  const titleClass = {
    empty: 'text-slate-500',
    error: 'text-red-500',
    success: 'text-emerald-600',
  }[tone];
  const messageClass = {
    empty: 'text-slate-500',
    error: 'text-red-700',
    success: 'text-emerald-700',
  }[tone];

  return (
    <View className={`rounded-xl border px-4 py-3 ${boxClass}`}>
      <Text className={`text-xs font-semibold uppercase tracking-wider ${titleClass}`}>
        {title}
      </Text>
      <Text className={`mt-1 text-sm leading-5 ${messageClass}`}>{message}</Text>
    </View>
  );
}
