import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Snackbar } from '@/components/snackbar';
import { fetchProfile, type UserProfile } from '@/lib/auth-api';
import { clearAuthSession, getAccessToken } from '@/lib/auth-session';
import { setPendingFlashToast } from '@/lib/flash-toast';

const QUICK_ACTIONS = [
  {
    label: 'Order Meds',
    icon: 'medkit'        as const,
    route: '/orders',
    bg: '#0F766E',
    glow: '#34D399',
  },
  {
    label: 'Lab Test',
    icon: 'flask'         as const,
    route: '/orders',
    bg: '#4F46E5',
    glow: '#818CF8',
  },
  {
    label: 'Profile',
    icon: 'person-circle' as const,
    route: '/profile',
    bg: '#E11D48',
    glow: '#FB7185',
  },
];

export default function DashboardScreen() {
  const [profile, setProfile]               = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading]           = useState(true);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardAnim   = useRef(new Animated.Value(0)).current;
  const pulseAnim  = useRef(new Animated.Value(0)).current;

  // Per-action press scale animations
  const scaleAnims = useRef(QUICK_ACTIONS.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          setPendingFlashToast({ message: 'No saved session. Please sign in.', tone: 'error' });
          router.replace('/login');
          return;
        }
        const userProfile = await fetchProfile(accessToken);
        if (isMounted) setProfile(userProfile);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to load profile.';
        const isAuthError = /401|403|unauthoriz|invalid token|expired/i.test(message);
        if (isAuthError) {
          await clearAuthSession();
          setPendingFlashToast({ message: message || 'Session expired.', tone: 'error' });
          if (isMounted) router.replace('/login');
        } else {
          setSnackbarMessage(message);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadProfile();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(headerAnim, {
        toValue: 1, duration: 600, easing: Easing.out(Easing.exp), useNativeDriver: true,
      }),
      Animated.timing(cardAnim, {
        toValue: 1, duration: 700, easing: Easing.out(Easing.exp), useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  function pressIn(i: number) {
    Animated.spring(scaleAnims[i], {
      toValue: 0.88, useNativeDriver: true, speed: 40, bounciness: 4,
    }).start();
  }

  function pressOut(i: number) {
    Animated.spring(scaleAnims[i], {
      toValue: 1, useNativeDriver: true, speed: 20, bounciness: 10,
    }).start();
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#F0FDF9] px-6">
        <StatusBar style="dark" />
        <View className="items-center">
          <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-teal-100">
            <Ionicons name="medkit" size={28} color="#0F766E" />
          </View>
          <Text className="text-[18px] font-black text-[#0F172A]">Loading your dashboard</Text>
          <Text className="mt-2 text-center text-[13px] leading-6 text-slate-400">
            Connecting to your account...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const heroTranslateY  = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });
  const cardsTranslateY = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [32, 0] });
  const glowOpacity     = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.28] });
  const firstName       = profile?.username?.split(' ')[0] ?? 'there';

  return (
    <SafeAreaView className="flex-1 bg-[#F0FDF9]">
      <StatusBar style="dark" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* ── Top bar ── */}
        <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
          <View>
            <Text className="text-[12px] font-semibold uppercase tracking-[1.8px] text-teal-600">
              Netmedika
            </Text>
            <Text className="text-[22px] font-black text-[#0F172A]">Good morning 👋</Text>
          </View>
          <Pressable
            onPress={() => router.push('/profile')}
            className="h-11 w-11 items-center justify-center rounded-full bg-teal-700 active:bg-teal-800"
          >
            <Text className="text-[15px] font-black text-white">
              {firstName.charAt(0).toUpperCase()}
            </Text>
          </Pressable>
        </View>

        <View className="px-4 pt-3">

          {/* ── Hero card ── */}
          <Animated.View
            style={{ opacity: headerAnim, transform: [{ translateY: heroTranslateY }] }}
            className="overflow-hidden rounded-[24px]"
          >
            <View className="bg-[#0F766E] px-6 pt-7 pb-8">
              <Animated.View
                style={{ opacity: glowOpacity }}
                className="absolute right-[-30px] top-[-30px] h-[160px] w-[160px] rounded-full bg-[#34D399]"
              />
              <View className="absolute bottom-[-50px] left-[-30px] h-[130px] w-[130px] rounded-full bg-white/10" />
              <View className="absolute right-[40px] bottom-[-20px] h-[80px] w-[80px] rounded-full bg-white/5" />

              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-4">
                  <View className="mb-3 self-start rounded-full bg-white/15 px-3 py-1">
                    <Text className="text-[11px] font-bold text-white/90 tracking-wide">
                      ✦ Your Health Hub
                    </Text>
                  </View>
                  <Text className="text-[26px] font-black leading-[32px] text-white">
                    Welcome back,{'\n'}{firstName}
                  </Text>
                  <Text className="mt-2 text-[13px] leading-[20px] text-teal-100/90">
                    Fast medication delivery & lab tests at your fingertips.
                  </Text>
                </View>
                <View className="items-center justify-center rounded-[18px] bg-white/15 p-3">
                  <Ionicons name="home" size={36} color="#fff" />
                </View>
              </View>
            </View>
          </Animated.View>

          {/* ── Quick Actions ── */}
          <Animated.View style={{ opacity: cardAnim, transform: [{ translateY: cardsTranslateY }] }}>
            <Text className="mt-7 mb-4 text-[13px] font-black uppercase tracking-[1.4px] text-slate-400">
              Quick Actions
            </Text>

            <View className="flex-row gap-3">
              {QUICK_ACTIONS.map((action, i) => (
                <Animated.View key={action.label} style={{ flex: 1, transform: [{ scale: scaleAnims[i] }] }}>
                  <Pressable
                    onPressIn={() => pressIn(i)}
                    onPressOut={() => pressOut(i)}
                    onPress={() => router.push(action.route as any)}
                  >
                    {/* Glow shadow layer */}
                    <View
                      style={{ backgroundColor: action.glow, shadowColor: action.glow }}
                      className="absolute bottom-0 left-2 right-2 h-8 rounded-full opacity-30 blur-sm"
                    />
                    <View
                      style={{ backgroundColor: action.bg }}
                      className="items-center rounded-[20px] px-2 py-5 shadow-lg"
                    >
                      {/* Icon container with inner glow ring */}
                      <View
                        style={{ borderColor: `${action.glow}55` }}
                        className="mb-3 h-12 w-12 items-center justify-center rounded-full border-2 bg-white/15"
                      >
                        <Ionicons name={action.icon} size={24} color="#fff" />
                      </View>
                      <Text className="text-center text-[11px] font-bold leading-[15px] text-white/90">
                        {action.label}
                      </Text>
                    </View>
                  </Pressable>
                </Animated.View>
              ))}
            </View>


            {/* ── Disclaimer ── */}
            <View className="mt-5 overflow-hidden rounded-[20px] border border-amber-200 bg-amber-50">
              {/* Header strip */}
              <View className="flex-row items-center gap-2.5 bg-amber-100 px-4 py-3">
                <View className="h-7 w-7 items-center justify-center rounded-full bg-amber-400">
                  <Ionicons name="alert" size={15} color="#fff" />
                </View>
                <Text className="text-[13px] font-black text-amber-800">
                  Medical Disclaimer
                </Text>
              </View>

              {/* Body */}
              <View className="px-4 py-4 gap-3">
                {[
                  {
                    icon: 'shield-checkmark-outline' as const,
                    color: '#0F766E',
                    bg: 'bg-teal-50',
                    text: 'This app is a pharmacy ordering platform — not a substitute for professional medical advice, diagnosis, or treatment.',
                  },
                  {
                    icon: 'medkit-outline' as const,
                    color: '#4F46E5',
                    bg: 'bg-indigo-50',
                    text: 'Always consult a licensed physician or pharmacist before starting, stopping, or changing any medication.',
                  },
                  {
                    icon: 'warning-outline' as const,
                    color: '#D97706',
                    bg: 'bg-amber-50',
                    text: 'In case of a medical emergency, call your local emergency services immediately. Do not rely on this app.',
                  },
                  {
                    icon: 'lock-closed-outline' as const,
                    color: '#E11D48',
                    bg: 'bg-rose-50',
                    text: 'Your health data is encrypted and never shared with third parties without your explicit consent.',
                  },
                ].map((item, idx) => (
                  <View key={idx} className="flex-row items-start gap-3">
                    <View className={`mt-0.5 h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.bg}`}>
                      <Ionicons name={item.icon} size={16} color={item.color} />
                    </View>
                    <Text className="flex-1 text-[12px] leading-[18px] text-amber-900/80">
                      {item.text}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Footer */}
              <View className="flex-row items-center gap-1.5 border-t border-amber-200 px-4 py-2.5">
                <Ionicons name="information-circle-outline" size={13} color="#92400e" />
                <Text className="text-[11px] text-amber-700">
                  By using Netmedika you agree to our Terms of Service & Privacy Policy.
                </Text>
              </View>
            </View>

          </Animated.View>
        </View>
      </ScrollView>

      <Snackbar
        visible={!!snackbarMessage}
        message={snackbarMessage}
        tone="error"
        onHide={() => setSnackbarMessage('')}
      />
    </SafeAreaView>
  );
}