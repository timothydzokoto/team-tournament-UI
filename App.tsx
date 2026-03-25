import { StatusBar } from 'expo-status-bar';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';

import './global.css';

import { AppNavigator } from './src/navigation/AppNavigator';
import { appGluestackConfig } from './src/theme/gluestack';
import SplashScreenComponent from './src/components/SplashScreen';

export default function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  useEffect(() => {
    // Prevent the native splash screen from auto-hiding
    SplashScreen.preventAutoHideAsync();
  }, []);

  const handleSplashFinish = () => {
    setIsSplashVisible(false);
    // Hide the native splash screen
    SplashScreen.hideAsync();
  };

  if (isSplashVisible) {
    return <SplashScreenComponent onFinish={handleSplashFinish} />;
  }

  return (
    <SafeAreaProvider>
      <GluestackUIProvider config={appGluestackConfig}>
        <AppNavigator />
        <StatusBar style="dark" />
      </GluestackUIProvider>
    </SafeAreaProvider>
  );
}
