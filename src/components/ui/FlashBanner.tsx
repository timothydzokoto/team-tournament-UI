import { Text, View } from 'react-native';

type FlashBannerProps = {
  label: string;
  message: string;
  tone?: 'success' | 'info';
};

const toneMap = {
  info: 'border-sky-500/20 bg-sky-500/10 text-sky-100',
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100',
} as const;

export function FlashBanner({ label, message, tone = 'success' }: FlashBannerProps) {
  return (
    <View
      className={`mx-auto mt-3 w-full max-w-[1120px] rounded-[22px] border px-4 py-3 ${toneMap[tone]}`}>
      <Text className="text-xs font-medium uppercase tracking-[2px] text-stone-300">{label}</Text>
      <Text className="mt-2 text-sm leading-6 text-current">{message}</Text>
    </View>
  );
}
