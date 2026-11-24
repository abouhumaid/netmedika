import '../global.css';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { initializeAuthSession } from '@/lib/auth-session';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    initializeAuthSession().finally(() => {
      if (mounted) setAuthReady(true);
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!authReady) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F4FFFC]">
        <ActivityIndicator color="#0F766E" />
      </View>
    );
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
