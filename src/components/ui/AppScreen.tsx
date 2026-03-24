import { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AppScreenProps = {
  accent?: 'emerald' | 'sky' | 'violet' | 'amber';
  hero: ReactNode;
  children: ReactNode;
};

const accentMap = {
  amber: 'bg-amber-500/10',
  emerald: 'bg-emerald-500/10',
  sky: 'bg-sky-500/10',
  violet: 'bg-violet-500/10',
} as const;

export function AppScreen({ accent = 'amber', hero, children }: AppScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-pitch">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View className="absolute left-[-40px] top-10 h-40 w-40 rounded-full bg-amber-500/10" />
        <View className="absolute right-[-22px] top-36 h-28 w-28 rounded-full bg-sky-500/10" />
        <View
          className={`absolute bottom-12 left-10 h-24 w-24 rounded-full ${accentMap[accent]}`}
        />

        <View className="w-full max-w-[1120px] self-center">
          {hero}
          <View className="mt-5 gap-4">{children}</View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
