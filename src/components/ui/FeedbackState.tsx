import { Alert, AlertText, Text } from '@gluestack-ui/themed';

type FeedbackStateProps = {
  title: string;
  message: string;
  tone?: 'error' | 'empty' | 'success';
};

const toneMap = {
  empty: {
    action: 'info' as const,
    bg: '$backgroundDark950',
    borderColor: '$borderDark800',
    color: '$textLight300',
  },
  error: {
    action: 'error' as const,
    bg: '$rose500',
    borderColor: '$rose400',
    color: '$rose50',
  },
  success: {
    action: 'success' as const,
    bg: '$emerald500',
    borderColor: '$emerald400',
    color: '$emerald50',
  },
} as const;

export function FeedbackState({ title, message, tone = 'empty' }: FeedbackStateProps) {
  const style = toneMap[tone];

  return (
    <Alert
      action={style.action}
      variant="outline"
      borderRadius="$2xl"
      borderWidth="$1"
      px="$4"
      py="$4"
      bg={style.bg}
      borderColor={style.borderColor}>
      <Text color={style.color} className="text-xs font-medium uppercase tracking-[2px]">
        {title}
      </Text>
      <AlertText color={style.color} className="mt-2 text-sm leading-6">
        {message}
      </AlertText>
    </Alert>
  );
}
