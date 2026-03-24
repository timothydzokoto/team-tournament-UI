import { ReactNode } from 'react';
import { Text, View } from '@gluestack-ui/themed';

type DetailRowProps = {
  label: string;
  value: string;
  valueTone?: 'default' | 'positive' | 'muted';
  trailing?: ReactNode;
};

const valueToneMap = {
  default: '$textLight200',
  muted: '$textLight400',
  positive: '$emerald400',
} as const;

export function DetailRow({ label, value, valueTone = 'default', trailing }: DetailRowProps) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className="text-xs uppercase tracking-[1px] text-stone-500">{label}</Text>
      <View className="flex-row items-center gap-2">
        <Text className="text-sm" color={valueToneMap[valueTone]}>
          {value}
        </Text>
        {trailing}
      </View>
    </View>
  );
}
