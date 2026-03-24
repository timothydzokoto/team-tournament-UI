import { Badge, BadgeText } from '@gluestack-ui/themed';

type StatusBadgeProps = {
  label: string;
  tone?: 'amber' | 'emerald' | 'rose' | 'sky' | 'violet' | 'slate';
};

const toneMap = {
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
  rose: {
    bg: '$rose500',
    borderColor: '$rose400',
    color: '$rose50',
  },
  sky: {
    bg: '$sky500',
    borderColor: '$sky400',
    color: '$sky100',
  },
  slate: {
    bg: '$backgroundDark900',
    borderColor: '$borderDark800',
    color: '$textLight300',
  },
  violet: {
    bg: '$violet500',
    borderColor: '$violet400',
    color: '$violet100',
  },
} as const;

export function StatusBadge({ label, tone = 'slate' }: StatusBadgeProps) {
  const style = toneMap[tone];

  return (
    <Badge
      alignSelf="flex-start"
      borderRadius="$full"
      borderWidth="$1"
      px="$3"
      py="$2"
      bg={style.bg}
      borderColor={style.borderColor}>
      <BadgeText
        color={style.color}
        fontSize="$2xs"
        fontWeight="$medium"
        textTransform="uppercase"
        letterSpacing="$lg">
        {label}
      </BadgeText>
    </Badge>
  );
}
