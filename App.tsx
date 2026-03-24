import { StatusBar } from 'expo-status-bar';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import './global.css';

import { AppNavigator } from './src/navigation/AppNavigator';
import { appGluestackConfig } from './src/theme/gluestack';

export default function App() {
  return (
    <SafeAreaProvider>
      <GluestackUIProvider config={appGluestackConfig}>
        <AppNavigator />
        <StatusBar style="dark" />
      </GluestackUIProvider>
    </SafeAreaProvider>
  );
}
