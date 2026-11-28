import '../global.css';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import StartupSplash from '@/components/StartupSplash';
import { initializeAuthSession } from '@/lib/auth-session';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
SplashScreen.setOptions({ duration: 250, fade: true });

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    let finishTimer: ReturnType<typeof setTimeout> | undefined;

    async function prepareApp() {
      await initializeAuthSession().catch(() => undefined);
      await SplashScreen.hideAsync().catch(() => undefined);
      finishTimer = setTimeout(() => {
        if (mounted) setAuthReady(true);
      }, 1400);
    }

    void prepareApp();

    return () => {
      mounted = false;
      if (finishTimer) clearTimeout(finishTimer);
    };
  }, []);

  if (!authReady) {
    return <StartupSplash />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 240,
          contentStyle: { backgroundColor: '#F4FFFC' },
        }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="notifications" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="admin/notifications" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="change-password" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="admin/(tabs)" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
