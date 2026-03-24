import { ReactNode } from 'react';
import { Card, Heading, Text, View } from '@gluestack-ui/themed';

type SurfaceCardProps = {
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function SurfaceCard({ title, eyebrow, action, children }: SurfaceCardProps) {
  return (
    <Card
      borderRadius="$3xl"
      borderWidth="$1"
      borderColor="$borderDark800"
      bg="$backgroundDark900"
      px="$5"
      py="$5">
      {title || eyebrow || action ? (
        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-1">
            {eyebrow ? (
              <Text className="text-xs font-medium uppercase tracking-[2px] text-mist">
                {eyebrow}
              </Text>
            ) : null}
            {title ? (
              <Heading className="mt-2 text-xl font-semibold text-stone-50">{title}</Heading>
            ) : null}
          </View>
          {action}
        </View>
      ) : null}

      <View className={title || eyebrow || action ? 'mt-4' : ''}>{children}</View>
    </Card>
  );
}
