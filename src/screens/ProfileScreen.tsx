import { View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppScreen } from '../components/ui/AppScreen';
import { DetailRow } from '../components/ui/DetailRow';
import { HeroPanel } from '../components/ui/HeroPanel';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { useSession } from '../context/SessionContext';
import { API_ORIGIN } from '../config/api';

export function ProfileScreen() {
  const { signOut, user } = useSession();

  return (
    <AppScreen
      accent="sky"
      hero={
        <HeroPanel
          accent="sky"
          eyebrow="Account"
          title="Profile and session"
          description="Review the signed-in operator, confirm the backend origin in use, and end the session cleanly when needed."
          aside={
            <View className="gap-3 md:items-end">
              <StatusBadge label={user?.is_superuser ? 'Superuser' : 'Operator'} tone="sky" />
              <AppButton label="Log out" onPress={signOut} variant="secondary" />
            </View>
          }
        />
      }>
      <SurfaceCard eyebrow="Identity" title="Signed-in user">
        <View className="rounded-[26px] border border-stone-800 bg-pitch p-4">
          <DetailRow label="Username" value={user?.username || 'Unknown'} />
          <DetailRow label="Email" value={user?.email || 'Unknown'} />
          <DetailRow label="Active" value={user?.is_active ? 'Yes' : 'No'} />
          <DetailRow label="Superuser" value={user?.is_superuser ? 'Yes' : 'No'} />
        </View>
      </SurfaceCard>

      <SurfaceCard eyebrow="Backend" title="Current environment">
        <View className="rounded-[26px] border border-stone-800 bg-pitch p-4">
          <DetailRow label="API origin" value={API_ORIGIN} />
          <DetailRow label="Mode" value="Expo mobile client" />
          <DetailRow label="Session" value="Bearer token in secure storage" />
        </View>
      </SurfaceCard>
    </AppScreen>
  );
}
