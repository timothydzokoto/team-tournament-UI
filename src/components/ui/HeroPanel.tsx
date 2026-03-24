import { ReactNode } from 'react';
import { Heading, Text, View } from '@gluestack-ui/themed';

type HeroPanelProps = {
  accent?: 'amber' | 'emerald' | 'sky' | 'violet';
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
};

const accentMap = {
  amber: {
    bg: '$amber500',
    borderColor: '$amber400',
    color: '$amber100',
  },
  emerald: {
    bg: '$emerald500',
    borderColor: '$emerald400',
    color: '$emerald100',
  },
  sky: {
    bg: '$sky500',
    borderColor: '$sky400',
    color: '$sky100',
  },
  violet: {
    bg: '$violet500',
    borderColor: '$violet400',
    color: '$violet100',
  },
} as const;

export function HeroPanel({
  accent = 'amber',
  eyebrow,
  title,
  description,
  aside,
}: HeroPanelProps) {
  const tone = accentMap[accent];

  return (
    <View
      className="overflow-hidden rounded-[32px] border px-6 py-6"
      bg={tone.bg}
      borderColor={tone.borderColor}>
      <View className="gap-5 md:flex-row md:items-end md:justify-between">
        <View className="flex-1">
          <Text className="text-xs font-medium uppercase tracking-[2px]" color={tone.color}>
            {eyebrow}
          </Text>
          <Heading className="mt-3 text-3xl font-semibold text-fog md:text-4xl">{title}</Heading>
          <Text className="mt-3 max-w-[720px] text-sm leading-7 text-stone-200">{description}</Text>
        </View>
        {aside ? <View className="md:items-end">{aside}</View> : null}
      </View>
    </View>
  );
}
