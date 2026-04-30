import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Toast, ToastDescription, ToastTitle, useToast } from '@gluestack-ui/themed';

import { SessionProvider, useSession } from '../context/SessionContext';
import { ActivityScreen } from '../screens/ActivityScreen';
import { CreatePlayerScreen } from '../screens/CreatePlayerScreen';
import { CreateSubteamScreen } from '../screens/CreateSubteamScreen';
import { CreateTeamScreen } from '../screens/CreateTeamScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { EditPlayerScreen } from '../screens/EditPlayerScreen';
import { EditSubteamScreen } from '../screens/EditSubteamScreen';
import { EditTeamScreen } from '../screens/EditTeamScreen';
import { FaceMatchScreen } from '../screens/FaceMatchScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LiveCaptureScreen } from '../screens/LiveCaptureScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { PlayerDetailScreen } from '../screens/PlayerDetailScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SubteamDetailScreen } from '../screens/SubteamDetailScreen';
import { TeamDetailScreen } from '../screens/TeamDetailScreen';
import { deletePlayer, type Player } from '../services/players';
import { deleteSubteam, type Subteam } from '../services/subteams';
import { deleteTeam, type Team } from '../services/teams';
import type { AppRoute, CaptureAsset } from './types';

type RootTab = 'Home' | 'Teams' | 'Verify' | 'Activity' | 'Profile';
type TabStacks = Record<RootTab, AppRoute[]>;

const TAB_LABELS: Record<RootTab, string> = {
  Home: 'Home',
  Teams: 'Teams',
  Verify: 'Verify',
  Activity: 'Activity',
  Profile: 'Profile',
};

const TAB_HINTS: Record<RootTab, string> = {
  Home: 'overview',
  Teams: 'manage',
  Verify: 'match',
  Activity: 'history',
  Profile: 'session',
};

function createInitialStacks(): TabStacks {
  return {
    Home: [{ name: 'Home' }],
    Teams: [{ name: 'Teams', params: { refreshKey: 0 } }],
    Verify: [{ name: 'FaceMatch' }],
    Activity: [{ name: 'Activity', params: { refreshKey: 0 } }],
    Profile: [{ name: 'Profile' }],
  };
}

const SCREEN_WIDTH = Dimensions.get('window').width;

type TransitionKind = 'tab' | 'push' | 'pop';

function AnimatedScreen({
  children,
  kind,
}: {
  children: React.ReactNode;
  kind: TransitionKind;
}) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(kind === 'push' ? SCREEN_WIDTH * 0.18 : 0);
  const translateY = useSharedValue(kind === 'tab' ? 10 : kind === 'pop' ? -6 : 0);

  useEffect(() => {
    const easing = Easing.out(Easing.cubic);
    opacity.value = withTiming(1, { duration: 230, easing });
    translateX.value = withTiming(0, { duration: 230, easing });
    translateY.value = withTiming(0, { duration: 230, easing });
  }, [opacity, translateX, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    flex: 1,
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

export function AppNavigator() {
  return (
    <SessionProvider>
      <RootNavigation />
    </SessionProvider>
  );
}

function RootNavigation() {
  const { booting, token, user } = useSession();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<RootTab>('Home');
  const [tabStacks, setTabStacks] = useState<TabStacks>(createInitialStacks);
  const [flashMessage, setFlashMessage] = useState<{
    label: string;
    message: string;
    tone?: 'success' | 'info';
  } | null>(null);
  const [pendingCapture, setPendingCapture] = useState<{
    consumerKey: string;
    asset: CaptureAsset;
    source: 'camera';
  } | null>(null);
  const [authScreen, setAuthScreen] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    if (!flashMessage) {
      return;
    }

    toastRef.current.show({
      placement: 'top',
      duration: 2800,
      render: ({ id }) => (
        <Toast
          nativeID={id}
          action={flashMessage.tone === 'success' ? 'success' : 'info'}
          variant="accent">
          <ToastTitle>{flashMessage.label}</ToastTitle>
          <ToastDescription>{flashMessage.message}</ToastDescription>
        </Toast>
      ),
    });

    const timeoutId = setTimeout(() => setFlashMessage(null), 3000);
    return () => clearTimeout(timeoutId);
  }, [flashMessage]);

  useEffect(() => {
    if (!token) {
      setActiveTab('Home');
      setTabStacks(createInitialStacks());
      setAuthScreen('login');
    }
  }, [token]);

  const currentStack = tabStacks[activeTab];
  const currentRoute = currentStack[currentStack.length - 1] ?? { name: 'Home' as const };
  const canGoBack = currentStack.length > 1;
  const isImmersiveRoute = currentRoute.name === 'LiveCapture';

  const routeKey = `${activeTab}-${currentRoute.name}`;
  const prevActiveTabRef = useRef(activeTab);
  const prevStackLengthRef = useRef(currentStack.length);
  const prevRouteKeyRef = useRef(routeKey);
  const transitionKindRef = useRef<TransitionKind>('tab');

  if (routeKey !== prevRouteKeyRef.current) {
    if (activeTab !== prevActiveTabRef.current) {
      transitionKindRef.current = 'tab';
    } else if (currentStack.length > prevStackLengthRef.current) {
      transitionKindRef.current = 'push';
    } else {
      transitionKindRef.current = 'pop';
    }
    prevRouteKeyRef.current = routeKey;
    prevActiveTabRef.current = activeTab;
    prevStackLengthRef.current = currentStack.length;
  }

  if (booting) {
    return (
      <View className="flex-1 items-center justify-center bg-pitch px-6">
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text className="mt-4 text-base text-stone-300">Restoring session...</Text>
      </View>
    );
  }

  if (!token) {
    return authScreen === 'login' ? (
      <LoginScreen onSwitchToSignup={() => setAuthScreen('signup')} />
    ) : (
      <SignupScreen onSwitchToLogin={() => setAuthScreen('login')} />
    );
  }

  function push(route: AppRoute, tab: RootTab = activeTab) {
    setTabStacks((current) => ({
      ...current,
      [tab]: [...current[tab], route],
    }));
  }

  function replaceTabRoot(tab: RootTab, route: AppRoute) {
    setTabStacks((current) => ({
      ...current,
      [tab]: [route],
    }));
  }

  function updateTabStack(tab: RootTab, updater: (stack: AppRoute[]) => AppRoute[]) {
    setTabStacks((current) => ({
      ...current,
      [tab]: updater(current[tab]),
    }));
  }

  function goBack() {
    updateTabStack(activeTab, (stack) => (stack.length > 1 ? stack.slice(0, -1) : stack));
  }

  function switchTab(tab: RootTab) {
    setActiveTab(tab);
  }

  function openCreatedTeam(teamId: number, teamName: string) {
    const refreshKey = Date.now();
    setFlashMessage({
      label: 'Team created',
      message: `${teamName} is ready for subteams and roster setup.`,
      tone: 'success',
    });
    setActiveTab('Teams');
    setTabStacks((current) => ({
      ...current,
      Teams: [
        { name: 'Teams', params: { refreshKey } },
        { name: 'TeamDetail', params: { teamId, teamName, refreshKey } },
      ],
    }));
  }

  function applyUpdatedTeam(team: Team) {
    const refreshKey = Date.now();
    setFlashMessage({
      label: 'Team updated',
      message: `${team.name} was saved successfully.`,
      tone: 'success',
    });
    updateTabStack('Teams', (stack) =>
      stack.slice(0, -1).map((route) => {
        if (route.name === 'Teams') {
          return { ...route, params: { refreshKey } };
        }

        if (route.name === 'TeamDetail' && route.params.teamId === team.id) {
          return { ...route, params: { ...route.params, teamName: team.name, refreshKey } };
        }

        return route;
      })
    );
  }

  function openCreatedSubteam(subteamId: number, subteamName: string, teamId: number) {
    const refreshKey = Date.now();
    setFlashMessage({
      label: 'Subteam created',
      message: `${subteamName} is now available under the selected team.`,
      tone: 'success',
    });
    updateTabStack('Teams', (stack) => {
      const base = stack.slice(0, -1).map((route) => {
        if (route.name === 'TeamDetail' && route.params.teamId === teamId) {
          return { ...route, params: { ...route.params, refreshKey } };
        }
        return route;
      });

      return [...base, { name: 'SubteamDetail', params: { subteamId, subteamName, refreshKey } }];
    });
  }

  function applyUpdatedSubteam(subteam: Subteam) {
    const refreshKey = Date.now();
    setFlashMessage({
      label: 'Subteam updated',
      message: `${subteam.name} was saved successfully.`,
      tone: 'success',
    });
    updateTabStack('Teams', (stack) =>
      stack.slice(0, -1).map((route) => {
        if (route.name === 'TeamDetail' && route.params.teamId === subteam.team_id) {
          return { ...route, params: { ...route.params, refreshKey } };
        }

        if (route.name === 'SubteamDetail' && route.params.subteamId === subteam.id) {
          return { ...route, params: { ...route.params, subteamName: subteam.name, refreshKey } };
        }

        return route;
      })
    );
  }

  function openCreatedPlayer(playerId: number, playerName: string, subteamId: number) {
    const refreshKey = Date.now();
    setFlashMessage({
      label: 'Player created',
      message: `${playerName} was added to the roster.`,
      tone: 'success',
    });
    updateTabStack('Teams', (stack) => {
      const base = stack.slice(0, -1).map((route) => {
        if (route.name === 'SubteamDetail' && route.params.subteamId === subteamId) {
          return { ...route, params: { ...route.params, refreshKey } };
        }
        return route;
      });

      return [...base, { name: 'PlayerDetail', params: { playerId, playerName, subteamId } }];
    });
  }

  function applyUpdatedPlayer(player: Player) {
    setFlashMessage({
      label: 'Player updated',
      message: `${player.first_name} ${player.last_name} was saved successfully.`,
      tone: 'success',
    });
    updateTabStack('Teams', (stack) => {
      const refreshKey = Date.now();
      return stack.slice(0, -1).map((route) => {
        if (route.name === 'SubteamDetail' && route.params.subteamId === player.subteam_id) {
          return { ...route, params: { ...route.params, refreshKey } };
        }

        if (route.name === 'PlayerDetail' && route.params.playerId === player.id) {
          return {
            ...route,
            params: {
              ...route.params,
              playerName: `${player.first_name} ${player.last_name}`,
            },
          };
        }

        return route;
      });
    });
  }

  async function handleDeleteTeam(teamId: number) {
    if (!token) {
      return;
    }

    await deleteTeam(token, teamId);
    const refreshKey = Date.now();
    setFlashMessage({
      label: 'Team deleted',
      message: 'The team was removed successfully.',
      tone: 'success',
    });
    replaceTabRoot('Teams', { name: 'Teams', params: { refreshKey } });
    setActiveTab('Teams');
  }

  async function handleDeleteSubteam(subteamId: number, teamId: number) {
    if (!token) {
      return;
    }

    await deleteSubteam(token, subteamId);
    const refreshKey = Date.now();
    setFlashMessage({
      label: 'Subteam deleted',
      message: 'The subteam was removed successfully.',
      tone: 'success',
    });
    updateTabStack('Teams', (stack) =>
      stack.slice(0, -1).map((route) => {
        if (route.name === 'TeamDetail' && route.params.teamId === teamId) {
          return { ...route, params: { ...route.params, refreshKey } };
        }
        return route;
      })
    );
    setActiveTab('Teams');
  }

  async function handleDeletePlayer(playerId: number, subteamId: number) {
    if (!token) {
      return;
    }

    await deletePlayer(token, playerId);
    const refreshKey = Date.now();
    setFlashMessage({
      label: 'Player deleted',
      message: 'The player was removed from the roster.',
      tone: 'success',
    });
    updateTabStack('Teams', (stack) =>
      stack.slice(0, -1).map((route) => {
        if (route.name === 'SubteamDetail' && route.params.subteamId === subteamId) {
          return { ...route, params: { ...route.params, refreshKey } };
        }
        return route;
      })
    );
    setActiveTab('Teams');
  }

  const rightBadge = TAB_LABELS[activeTab];
  const routeSubtitle = getRouteSubtitle(currentRoute, activeTab);

  if (isImmersiveRoute) {
    return (
      <View className="flex-1 bg-black">
        <AnimatedScreen key={routeKey} kind={transitionKindRef.current}>
          {renderRoute({
            activeTab,
            currentRoute,
            routeStack: tabStacks[activeTab],
            goBack,
            openHome: () => switchTab('Home'),
            openTeams: () => switchTab('Teams'),
            openVerify: () => switchTab('Verify'),
            openActivity: () =>
              setTabStacks((current) => ({
                ...current,
                Activity: [{ name: 'Activity', params: { refreshKey: Date.now() } }],
              })),
            openProfile: () => switchTab('Profile'),
            push,
            pendingCapture,
            setPendingCapture,
            openCreatedTeam,
            openCreatedSubteam,
            openCreatedPlayer,
            applyUpdatedTeam,
            applyUpdatedSubteam,
            applyUpdatedPlayer,
            handleDeleteTeam,
            handleDeleteSubteam,
            handleDeletePlayer,
          })}
        </AnimatedScreen>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-pitch">
      <View className="border-b border-stone-800 bg-panel px-4 py-3">
        <View className="mx-auto w-full max-w-[1120px] flex-row items-center justify-between gap-4">
          <View className="w-24 items-start">
            {canGoBack ? (
              <Pressable
                className="min-h-11 min-w-20 items-center justify-center rounded-full border border-amber-400/20 bg-amber-500/10 px-4"
                hitSlop={8}
                onPress={goBack}>
                <Text className="text-sm font-medium text-amber-300">Back</Text>
              </Pressable>
            ) : (
              <View className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                <Text className="text-[11px] font-medium uppercase tracking-[2px] text-emerald-300">
                  Live
                </Text>
              </View>
            )}
          </View>
          <Text
            className="flex-1 px-4 text-center text-base font-semibold text-fog"
            numberOfLines={1}>
            {getRouteTitle(currentRoute)}
          </Text>
          <Text
            className="absolute bottom-[-10px] left-28 right-28 text-center text-[11px] uppercase tracking-[1.5px] text-stone-500"
            numberOfLines={1}>
            {routeSubtitle}
          </Text>
          <View className="w-24 items-end">
            <View className="rounded-full border border-stone-800 bg-pitch px-3 py-2">
              <Text className="text-[11px] font-medium uppercase tracking-[2px] text-stone-400">
                {user?.username || rightBadge}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <AnimatedScreen key={routeKey} kind={transitionKindRef.current}>
        {renderRoute({
          activeTab,
          currentRoute,
          routeStack: tabStacks[activeTab],
          goBack,
          openHome: () => switchTab('Home'),
          openTeams: () => switchTab('Teams'),
          openVerify: () => switchTab('Verify'),
          openActivity: () =>
            setTabStacks((current) => ({
              ...current,
              Activity: [{ name: 'Activity', params: { refreshKey: Date.now() } }],
            })),
          openProfile: () => switchTab('Profile'),
          push,
          pendingCapture,
          setPendingCapture,
          openCreatedTeam,
          openCreatedSubteam,
          openCreatedPlayer,
          applyUpdatedTeam,
          applyUpdatedSubteam,
          applyUpdatedPlayer,
          handleDeleteTeam,
          handleDeleteSubteam,
          handleDeletePlayer,
        })}
      </AnimatedScreen>

      <View
        style={{
          backgroundColor: '#0d1424',
          borderTopWidth: 1,
          borderTopColor: '#1e2a45',
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-around',
            paddingHorizontal: 8,
            paddingTop: 6,
            paddingBottom: Math.max(insets.bottom, 10),
            maxWidth: 1120,
            alignSelf: 'center',
            width: '100%',
          }}>
          {(
            [
              { label: TAB_LABELS.Home, icon: 'home', tab: 'Home' },
              { label: TAB_LABELS.Teams, icon: 'people', tab: 'Teams' },
              { label: TAB_LABELS.Verify, icon: 'camera', tab: 'Verify', center: true },
              { label: TAB_LABELS.Activity, icon: 'list', tab: 'Activity' },
              { label: TAB_LABELS.Profile, icon: 'person', tab: 'Profile' },
            ] as {
              label: string;
              icon: keyof typeof Ionicons.glyphMap;
              tab: RootTab;
              center?: boolean;
            }[]
          ).map(({ label, icon, tab, center }) => {
            const isActive = activeTab === tab;
            function handlePress() {
              if (tab === 'Activity') {
                replaceTabRoot('Activity', {
                  name: 'Activity',
                  params: { refreshKey: Date.now() },
                });
              }
              switchTab(tab);
            }

            if (center) {
              return (
                <Pressable
                  key={tab}
                  onPress={handlePress}
                  hitSlop={6}
                  style={{ alignItems: 'center', marginTop: -22 }}>
                  <View
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 30,
                      backgroundColor: isActive ? '#2563eb' : '#1e3a8a',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 3,
                      borderColor: '#0d1424',
                      shadowColor: '#3b82f6',
                      shadowOffset: { width: 0, height: -3 },
                      shadowOpacity: isActive ? 0.6 : 0.2,
                      shadowRadius: 10,
                      elevation: 10,
                    }}>
                    <Ionicons name="camera" size={26} color="#fff" />
                  </View>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '600',
                      color: isActive ? '#60a5fa' : '#64748b',
                      marginTop: 5,
                    }}>
                    {label}
                  </Text>
                </Pressable>
              );
            }

            return (
              <Pressable
                key={tab}
                onPress={handlePress}
                hitSlop={8}
                style={{ alignItems: 'center', paddingHorizontal: 12, paddingBottom: 2 }}>
                <Ionicons
                  name={
                    isActive
                      ? (icon as keyof typeof Ionicons.glyphMap)
                      : (`${icon}-outline` as keyof typeof Ionicons.glyphMap)
                  }
                  size={22}
                  color={isActive ? '#60a5fa' : '#64748b'}
                />
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '600',
                    color: isActive ? '#60a5fa' : '#64748b',
                    marginTop: 3,
                  }}>
                  {label}
                </Text>
                <View
                  style={{
                    marginTop: 4,
                    height: 3,
                    width: 3,
                    borderRadius: 2,
                    backgroundColor: isActive ? '#3b82f6' : 'transparent',
                  }}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function renderRoute({
  activeTab,
  applyUpdatedPlayer,
  applyUpdatedSubteam,
  applyUpdatedTeam,
  currentRoute,
  goBack,
  handleDeletePlayer,
  handleDeleteSubteam,
  handleDeleteTeam,
  openActivity,
  openCreatedPlayer,
  openCreatedSubteam,
  openCreatedTeam,
  openHome,
  openProfile,
  openTeams,
  openVerify,
  push,
  pendingCapture,
  routeStack,
  setPendingCapture,
}: {
  activeTab: RootTab;
  applyUpdatedPlayer: (player: Player) => void;
  applyUpdatedSubteam: (subteam: Subteam) => void;
  applyUpdatedTeam: (team: Team) => void;
  currentRoute: AppRoute;
  goBack: () => void;
  handleDeletePlayer: (playerId: number, subteamId: number) => Promise<void>;
  handleDeleteSubteam: (subteamId: number, teamId: number) => Promise<void>;
  handleDeleteTeam: (teamId: number) => Promise<void>;
  openActivity: () => void;
  openCreatedPlayer: (playerId: number, playerName: string, subteamId: number) => void;
  openCreatedSubteam: (subteamId: number, subteamName: string, teamId: number) => void;
  openCreatedTeam: (teamId: number, teamName: string) => void;
  openHome: () => void;
  openProfile: () => void;
  openTeams: () => void;
  openVerify: () => void;
  pendingCapture: { consumerKey: string; asset: CaptureAsset; source: 'camera' } | null;
  push: (route: AppRoute, tab?: RootTab) => void;
  routeStack: AppRoute[];
  setPendingCapture: Dispatch<
    SetStateAction<{ consumerKey: string; asset: CaptureAsset; source: 'camera' } | null>
  >;
}) {
  if (currentRoute.name === 'Home') {
    return <HomeScreen onOpenFaceMatch={openVerify} onOpenTeams={openTeams} />;
  }

  if (currentRoute.name === 'Teams') {
    return (
      <DashboardScreen
        refreshKey={currentRoute.params.refreshKey}
        onCreateTeam={() => push({ name: 'CreateTeam' }, 'Teams')}
        onOpenFaceMatch={openVerify}
        onOpenMatchedPlayer={({ playerId, playerName, subteamId }) =>
          push({ name: 'PlayerDetail', params: { playerId, playerName, subteamId } }, activeTab)
        }
        onOpenTeam={({ teamId, teamName }) =>
          push({ name: 'TeamDetail', params: { teamId, teamName, refreshKey: 0 } }, 'Teams')
        }
      />
    );
  }

  if (currentRoute.name === 'CreateTeam') {
    return <CreateTeamScreen onCreated={(team) => openCreatedTeam(team.id, team.name)} />;
  }

  if (currentRoute.name === 'FaceMatch') {
    return (
      <FaceMatchScreen
        onOpenLiveCapture={() =>
          push(
            {
              name: 'LiveCapture',
              params: {
                consumerKey: 'match',
                mode: 'match',
                title: 'Live face verification',
                description:
                  'Center one face inside the guide frame, keep the eyes visible, then capture when the image looks steady.',
              },
            },
            'Verify'
          )
        }
        pendingCapture={pendingCapture?.consumerKey === 'match' ? pendingCapture : null}
        onConsumePendingCapture={() => {
          setPendingCapture((current) => (current?.consumerKey === 'match' ? null : current));
        }}
      />
    );
  }

  if (currentRoute.name === 'LiveCapture') {
    return (
      <LiveCaptureScreen
        mode={currentRoute.params.mode}
        title={currentRoute.params.title}
        description={currentRoute.params.description}
        onCancel={goBack}
        onCaptured={(asset) => {
          setPendingCapture({
            consumerKey: currentRoute.params.consumerKey,
            asset,
            source: 'camera',
          });
          goBack();
        }}
      />
    );
  }

  if (currentRoute.name === 'Activity') {
    return (
      <ActivityScreen
        refreshKey={currentRoute.params.refreshKey}
        onOpenMatchedPlayer={({ playerId, playerName }) =>
          push({ name: 'PlayerDetail', params: { playerId, playerName } }, 'Activity')
        }
      />
    );
  }

  if (currentRoute.name === 'Profile') {
    return <ProfileScreen />;
  }

  if (currentRoute.name === 'EditTeam') {
    return <EditTeamScreen teamId={currentRoute.params.teamId} onSaved={applyUpdatedTeam} />;
  }

  if (currentRoute.name === 'TeamDetail') {
    return (
      <TeamDetailScreen
        teamId={currentRoute.params.teamId}
        teamName={currentRoute.params.teamName}
        refreshKey={currentRoute.params.refreshKey}
        onEditTeam={() =>
          push({ name: 'EditTeam', params: { teamId: currentRoute.params.teamId } }, 'Teams')
        }
        onCreateSubteam={() =>
          push(
            {
              name: 'CreateSubteam',
              params: {
                teamId: currentRoute.params.teamId,
                teamName: currentRoute.params.teamName,
              },
            },
            'Teams'
          )
        }
        onDeleteTeam={() => handleDeleteTeam(currentRoute.params.teamId)}
        onOpenSubteam={({ subteamId, subteamName }) =>
          push(
            { name: 'SubteamDetail', params: { subteamId, subteamName, refreshKey: 0 } },
            'Teams'
          )
        }
      />
    );
  }

  if (currentRoute.name === 'CreateSubteam') {
    return (
      <CreateSubteamScreen
        teamId={currentRoute.params.teamId}
        teamName={currentRoute.params.teamName}
        onCreated={(subteam) =>
          openCreatedSubteam(subteam.id, subteam.name, currentRoute.params.teamId)
        }
      />
    );
  }

  if (currentRoute.name === 'EditSubteam') {
    return (
      <EditSubteamScreen
        subteamId={currentRoute.params.subteamId}
        teamId={currentRoute.params.teamId}
        onSaved={applyUpdatedSubteam}
      />
    );
  }

  if (currentRoute.name === 'SubteamDetail') {
    return (
      <SubteamDetailScreen
        subteamId={currentRoute.params.subteamId}
        subteamName={currentRoute.params.subteamName}
        refreshKey={currentRoute.params.refreshKey}
        onEditSubteam={() =>
          push(
            {
              name: 'EditSubteam',
              params: {
                subteamId: currentRoute.params.subteamId,
                teamId: findCurrentTeamId(routeStack),
              },
            },
            'Teams'
          )
        }
        onCreatePlayer={() =>
          push(
            {
              name: 'CreatePlayer',
              params: {
                subteamId: currentRoute.params.subteamId,
                subteamName: currentRoute.params.subteamName,
              },
            },
            'Teams'
          )
        }
        onDeleteSubteam={() =>
          handleDeleteSubteam(currentRoute.params.subteamId, findCurrentTeamId(routeStack))
        }
        onOpenPlayer={({ playerId, playerName }) =>
          push(
            {
              name: 'PlayerDetail',
              params: { playerId, playerName, subteamId: currentRoute.params.subteamId },
            },
            'Teams'
          )
        }
      />
    );
  }

  if (currentRoute.name === 'CreatePlayer') {
    return (
      <CreatePlayerScreen
        subteamId={currentRoute.params.subteamId}
        subteamName={currentRoute.params.subteamName}
        onCreated={(player) =>
          openCreatedPlayer(
            player.id,
            `${player.first_name} ${player.last_name}`,
            currentRoute.params.subteamId
          )
        }
      />
    );
  }

  if (currentRoute.name === 'EditPlayer') {
    return (
      <EditPlayerScreen
        playerId={currentRoute.params.playerId}
        subteamId={currentRoute.params.subteamId}
        onSaved={applyUpdatedPlayer}
      />
    );
  }

  return (
    <PlayerDetailScreen
      playerId={currentRoute.params.playerId}
      playerName={currentRoute.params.playerName}
      canManagePlayer={Boolean(currentRoute.params.subteamId)}
      onOpenLiveCapture={() =>
        push(
          {
            name: 'LiveCapture',
            params: {
              consumerKey: `player:${currentRoute.params.playerId}`,
              mode: 'enroll',
              title: 'Live enrollment capture',
              description:
                'Use the guide frame for one clear face with even lighting before sending the image for enrollment.',
            },
          },
          activeTab
        )
      }
      pendingCapture={
        pendingCapture?.consumerKey === `player:${currentRoute.params.playerId}`
          ? pendingCapture
          : null
      }
      onConsumePendingCapture={() => {
        setPendingCapture((current) =>
          current?.consumerKey === `player:${currentRoute.params.playerId}` ? null : current
        );
      }}
      onEditPlayer={() =>
        currentRoute.params.subteamId
          ? push(
              {
                name: 'EditPlayer',
                params: {
                  playerId: currentRoute.params.playerId,
                  subteamId: currentRoute.params.subteamId,
                },
              },
              'Teams'
            )
          : undefined
      }
      onDeletePlayer={() =>
        currentRoute.params.subteamId
          ? handleDeletePlayer(currentRoute.params.playerId, currentRoute.params.subteamId)
          : Promise.reject(new Error('Player deletion is unavailable without roster context.'))
      }
    />
  );
}

function findCurrentTeamId(routeStack: AppRoute[]) {
  for (let index = routeStack.length - 1; index >= 0; index -= 1) {
    const route = routeStack[index];
    if (route.name === 'TeamDetail') {
      return route.params.teamId;
    }
  }

  return 0;
}

function getRouteTitle(route: AppRoute) {
  if (route.name === 'Home') {
    return 'Home';
  }

  if (route.name === 'Teams') {
    return 'Teams';
  }

  if (route.name === 'CreateTeam') {
    return 'New team';
  }

  if (route.name === 'FaceMatch') {
    return 'Face match';
  }

  if (route.name === 'LiveCapture') {
    return route.params.title;
  }

  if (route.name === 'Activity') {
    return 'Activity';
  }

  if (route.name === 'Profile') {
    return 'Profile';
  }

  if (route.name === 'EditTeam') {
    return 'Edit team';
  }

  if (route.name === 'TeamDetail') {
    return route.params.teamName;
  }

  if (route.name === 'CreateSubteam') {
    return 'New subteam';
  }

  if (route.name === 'EditSubteam') {
    return 'Edit subteam';
  }

  if (route.name === 'SubteamDetail') {
    return route.params.subteamName;
  }

  if (route.name === 'CreatePlayer') {
    return 'New player';
  }

  if (route.name === 'EditPlayer') {
    return 'Edit player';
  }

  return route.params.playerName;
}

function getRouteSubtitle(route: AppRoute, activeTab: RootTab) {
  if (route.name === 'Home') {
    return 'Readiness, activity, and quick actions';
  }

  if (route.name === 'Teams') {
    return 'Teams, subteams, and player operations';
  }

  if (route.name === 'FaceMatch') {
    return 'Capture, preview, and verify a face image';
  }

  if (route.name === 'LiveCapture') {
    return 'Live camera framing with guide overlay';
  }

  if (route.name === 'Activity') {
    return 'Recent biometric outcomes on this device';
  }

  if (route.name === 'Profile') {
    return 'Session details and backend environment';
  }

  if (route.name === 'TeamDetail') {
    return 'Manage subteams and team-level actions';
  }

  if (route.name === 'SubteamDetail') {
    return 'Roster view, player drill-in, and create flow';
  }

  if (route.name === 'PlayerDetail') {
    return 'Profile details, enrollment image, and actions';
  }

  if (route.name === 'CreateTeam' || route.name === 'EditTeam') {
    return 'Team record form';
  }

  if (route.name === 'CreateSubteam' || route.name === 'EditSubteam') {
    return 'Subteam record form';
  }

  if (route.name === 'CreatePlayer' || route.name === 'EditPlayer') {
    return 'Player record form';
  }

  return TAB_HINTS[activeTab];
}
