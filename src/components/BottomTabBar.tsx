import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type RootTab = 'Home' | 'Teams' | 'Verify' | 'Activity' | 'Profile';

interface BottomTabBarProps {
  activeTab: RootTab;
  onTabPress: (tab: RootTab) => void;
}

const TAB_CONFIG: Record<RootTab, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  Home: { icon: 'home', label: 'Home' },
  Teams: { icon: 'people', label: 'Teams' },
  Verify: { icon: 'camera', label: 'Verify' },
  Activity: { icon: 'list', label: 'Activity' },
  Profile: { icon: 'person', label: 'Profile' },
};

const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onTabPress }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {Object.entries(TAB_CONFIG).map(([tab, config]) => (
        <TouchableOpacity
          key={tab}
          style={styles.tab}
          onPress={() => onTabPress(tab as RootTab)}
          accessibilityLabel={config.label}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === tab }}>
          <Ionicons
            name={config.icon}
            size={24}
            color={activeTab === tab ? '#3b82f6' : '#6b7280'}
          />
          <Text style={[styles.label, { color: activeTab === tab ? '#3b82f6' : '#6b7280' }]}>
            {config.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.9)' : '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minHeight: 50,
  },
  label: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});

export default BottomTabBar;
