import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Header from '@/components/header';
import { fetchProfile, logoutUser, type UserProfile } from '@/lib/auth-api';
import { clearAuthSession, getAccessToken } from '@/lib/auth-session';
import { Snackbar } from '@/components/snackbar';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';

function navigateTo(path: string) {
  setTimeout(() => router.replace(path as any), 0);
}

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [snack, setSnack] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) throw new Error('Not authenticated');
        const p = await fetchProfile(token);
        if (mounted) setProfile(p);
      } catch (err: any) {
        if (mounted) setSnack(err?.message ?? 'Failed to load profile');
      } finally { if (mounted) setIsLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  async function handleLogout() {
    try {
      setIsLoggingOut(true);
      const token = await getAccessToken();
      if (token) await logoutUser(token);
    } catch {}
    await clearAuthSession();
    setIsLoggingOut(false);
    navigateTo('/login');
  }
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#F0FDF9]">
        <StatusBar style="dark" />
        <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-teal-100">
          <ActivityIndicator size="large" color="#0F766E" />
        </View>
        <Text className="text-[18px] font-black text-[#0F172A]">Loading profile</Text>
        <Text className="mt-2 text-center text-[13px] leading-6 text-slate-400">Connecting to your account...</Text>
      </SafeAreaView>
    );
  }

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const firstLetter = (profile?.username ?? 'A').charAt(0).toUpperCase();

  return (
    <SafeAreaView className="flex-1 bg-[#F0FDF9]">
      <StatusBar style="dark" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <Header title="Profile" showBack={false} />

        <View className="px-4 pb-8 pt-6">

          <View className="mb-6 items-center">
            <View
              className="mb-4 h-24 w-24 items-center justify-center rounded-full bg-teal-700"
              style={{
                shadowColor: '#0F766E',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <Text className="text-[40px] font-black text-white">{firstLetter}</Text>
            </View>
            <Text className="text-[22px] font-black text-[#0F172A]">{profile?.username}</Text>
            <Text className="mt-1 text-[13px] text-slate-400">@{profile?.username?.toLowerCase()}</Text>
          </View>

          <View className="mb-4 overflow-hidden rounded-[18px] border border-slate-100 bg-white shadow-sm">
            <View className="flex-row items-center justify-between border-b border-slate-100 px-5 py-4">
              <View className="flex-1">
                <Text className="text-[11px] font-bold uppercase tracking-[0.8px] text-slate-400">Username</Text>
                <Text className="mt-1 text-[15px] font-bold text-[#0F172A]">{profile?.username}</Text>
              </View>
              <Pressable className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200">
                <Ionicons name="pencil" size={15} color="#0F766E" />
              </Pressable>
            </View>

            <View className="flex-row items-center justify-between px-5 py-4">
              <View className="flex-1">
                <Text className="text-[11px] font-bold uppercase tracking-[0.8px] text-slate-400">Email</Text>
                <Text className="mt-1 text-[15px] font-bold text-[#0F172A]">{profile?.email}</Text>
              </View>
              <Pressable className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200">
                <Ionicons name="pencil" size={15} color="#0F766E" />
              </Pressable>
            </View>
          </View>

          <View className="mb-4 rounded-[18px] border border-slate-100 bg-white px-5 py-4 shadow-sm">
            <View className="flex-row items-center gap-2 mb-3">
              <Ionicons name="shield-checkmark" size={17} color="#0F766E" />
              <Text className="text-[13px] font-black text-slate-600">Account Information</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-[13px] text-slate-500">Account Role</Text>
              <View className="rounded-full bg-teal-100 px-3 py-1">
                <Text className="text-[11px] font-black capitalize text-teal-700">{profile?.role}</Text>
              </View>
            </View>
          </View>

          <Pressable
            onPress={handleLogout}
            disabled={isLoggingOut}
            style={{
              backgroundColor: isLoggingOut ? '#E2E8F0' : '#E11D48',
              shadowColor: '#E11D48',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: isLoggingOut ? 0 : 0.3,
              shadowRadius: 12,
              elevation: isLoggingOut ? 0 : 6,
            }}
            className="mb-5 flex-row items-center justify-center gap-2 rounded-[16px] py-4"
          >
            {isLoggingOut
              ? <ActivityIndicator size="small" color="#94A3B8" />
              : <Ionicons name="log-out-outline" size={20} color="#fff" />
            }
            <Text className={`text-[15px] font-black ${isLoggingOut ? 'text-slate-400' : 'text-white'}`}>
              {isLoggingOut ? 'Signing Out...' : 'Log Out'}
            </Text>
          </Pressable>

          <View className="items-center rounded-[14px] bg-slate-100 px-4 py-3.5">
            <View className="flex-row items-center gap-2 mb-1">
              <Ionicons name="information-circle-outline" size={14} color="#64748B" />
              <Text className="text-[11px] font-bold text-slate-500">App Information</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text className="text-[11px] text-slate-400">NetMedika</Text>
              <View className="h-1 w-1 rounded-full bg-slate-400" />
              <Text className="text-[11px] font-bold text-slate-500">v{appVersion}</Text>
            </View>
          </View>

        </View>
      </ScrollView>

      <Snackbar visible={!!snack} message={snack} tone="error" onHide={() => setSnack('')} />
    </SafeAreaView>
  );
}
