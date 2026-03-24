import { ReactNode } from 'react';
import { Button as GsButton, ButtonSpinner, ButtonText } from '@gluestack-ui/themed';

type AppButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
};

const variantMap = {
  danger: {
    action: 'negative' as const,
    bg: '$rose500',
    borderColor: '$rose400',
    textColor: '$white',
    variant: 'solid' as const,
  },
  ghost: {
    action: 'secondary' as const,
    bg: '$backgroundDark950',
    borderColor: '$borderDark800',
    textColor: '$textLight50',
    variant: 'outline' as const,
  },
  primary: {
    action: 'primary' as const,
    bg: '$amber400',
    borderColor: '$amber300',
    textColor: '$backgroundDark950',
    variant: 'solid' as const,
  },
  secondary: {
    action: 'secondary' as const,
    bg: '$backgroundDark900',
    borderColor: '$borderDark800',
    textColor: '$textLight50',
    variant: 'outline' as const,
  },
} as const;

export function AppButton({
  label,
  onPress,
  variant = 'secondary',
  disabled,
  loading,
  icon,
}: AppButtonProps) {
  const styles = variantMap[variant];

  return (
    <GsButton
      size="md"
      action={styles.action}
      variant={styles.variant}
      minHeight={48}
      borderRadius="$2xl"
      px="$4"
      py="$3"
      bg={styles.bg}
      borderColor={styles.borderColor}
      opacity={disabled ? 0.6 : 1}
      isDisabled={disabled || loading}
      onPress={onPress}>
      {loading ? <ButtonSpinner color={styles.textColor} /> : icon}
      {!loading ? <ButtonText color={styles.textColor}>{label}</ButtonText> : null}
    </GsButton>
  );
}
