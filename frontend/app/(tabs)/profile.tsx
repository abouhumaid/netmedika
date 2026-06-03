import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

import Header from '@/components/header';
import { fetchProfile, logoutUser, type UserProfile } from '@/lib/auth-api';
import { clearAuthSession, getAccessToken } from '@/lib/auth-session';
import { Snackbar } from '@/components/snackbar';
import { setPendingFlashToast } from '@/lib/flash-toast';

// ─── Helper: deferred navigation ─────────────────────────────────────────────
// router.replace called synchronously during useEffect fires before the
// NavigationContainer is ready on Android. Deferring to the next tick fixes it.

function navigateTo(path: string) {
  setTimeout(() => router.replace(path as any), 0);
}

// ─── ProfileScreen ────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const [profile,        setProfile]        = useState<UserProfile | null>(null);
  const [isLoading,      setIsLoading]      = useState(true);
  const [isLoggingOut,   setIsLoggingOut]   = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const accessToken = await getAccessToken();

        if (!accessToken) {
          setPendingFlashToast({
            message: 'No saved session was found. Please sign in again.',
            tone: 'error',
          });
          navigateTo('/login');
          return;
        }

        const userProfile = await fetchProfile(accessToken);
        if (isMounted) setProfile(userProfile);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to load your profile right now.';
        const isAuthError = /401|403|unauthoriz|invalid token|expired/i.test(message);

        if (isAuthError) {
          await clearAuthSession();
          setPendingFlashToast({
            message: message || 'Your session expired. Please sign in again.',
            tone: 'error',
          });
          if (isMounted) navigateTo('/login');
        } else {
          if (isMounted) setSnackbarMessage(message);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadProfile();
    return () => { isMounted = false; };
  }, []);

  async function handleLogout() {
    try {
      setIsLoggingOut(true);
      const accessToken = await getAccessToken();
      if (accessToken) await logoutUser(accessToken);
    } catch {
      // Clear local session even if backend logout fails.
    } finally {
      await clearAuthSession();
      setIsLoggingOut(false);
      navigateTo('/login');
    }
  }

  const appVersion  = Constants.expoConfig?.version ?? '1.0.0';
  const firstLetter = (profile?.username ?? 'U').charAt(0).toUpperCase();

  // ── Loading ──
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#F0FDF9] px-6">
        <StatusBar style="dark" />
        <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-teal-100">
          <ActivityIndicator size="large" color="#0F766E" />
        </View>
        <Text className="text-[18px] font-black text-[#0F172A]">Loading your profile</Text>
        <Text className="mt-2 text-center text-[13px] leading-6 text-slate-400">
          Connecting to your account...
        </Text>
      </SafeAreaView>
    );
  }

  // ── Error / no profile ──
  if (!profile) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#F0FDF9] px-6">
        <StatusBar style="dark" />
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-rose-100">
          <Ionicons name="alert-circle-outline" size={32} color="#E11D48" />
        </View>
        <Text className="text-[18px] font-black text-[#0F172A]">Unable to load profile</Text>
        <Text className="mt-2 text-center text-[13px] leading-6 text-slate-400">
          Your session may have expired. Please sign in again.
        </Text>
        <Pressable
          onPress={() => navigateTo('/login')}
          className="mt-6 flex-row items-center gap-2 rounded-[14px] bg-teal-700 px-6 py-3.5 active:bg-teal-800"
        >
          <Ionicons name="log-in-outline" size={18} color="#fff" />
          <Text className="text-[14px] font-black text-white">Return to Login</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // ── Main ──
  return (
    <SafeAreaView className="flex-1 bg-[#F0FDF9]">
      <StatusBar style="dark" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <Header title="My Account" subtitle="Profile & Settings" showBack />

        <View className="px-4 pb-8 pt-6">

          {/* ── Avatar ── */}
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
            <Text className="text-[22px] font-black text-[#0F172A]">{profile.username}</Text>
            <Text className="mt-1 text-[13px] text-slate-400">@{profile.username.toLowerCase()}</Text>
          </View>

          {/* ── Profile info card ── */}
          <View className="mb-4 overflow-hidden rounded-[18px] border border-slate-100 bg-white shadow-sm">
            {/* Username row */}
            <View className="flex-row items-center justify-between border-b border-slate-100 px-5 py-4">
              <View className="flex-1">
                <Text className="text-[11px] font-bold uppercase tracking-[0.8px] text-slate-400">
                  Username
                </Text>
                <Text className="mt-1 text-[15px] font-bold text-[#0F172A]">
                  {profile.username}
                </Text>
              </View>
              <Pressable className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200">
                <Ionicons name="pencil" size={15} color="#0F766E" />
              </Pressable>
            </View>

            {/* Email row */}
            <View className="flex-row items-center justify-between px-5 py-4">
              <View className="flex-1">
                <Text className="text-[11px] font-bold uppercase tracking-[0.8px] text-slate-400">
                  Email
                </Text>
                <Text className="mt-1 text-[15px] font-bold text-[#0F172A]">
                  {profile.email}
                </Text>
              </View>
              <Pressable className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200">
                <Ionicons name="pencil" size={15} color="#0F766E" />
              </Pressable>
            </View>
          </View>

          {/* ── Account role ── */}
          <View className="mb-4 rounded-[18px] border border-slate-100 bg-white px-5 py-4 shadow-sm">
            <View className="flex-row items-center gap-2 mb-3">
              <Ionicons name="shield-checkmark" size={17} color="#0F766E" />
              <Text className="text-[13px] font-black text-slate-600">Account Information</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-[13px] text-slate-500">Account Role</Text>
              <View className="rounded-full bg-teal-100 px-3 py-1">
                <Text className="text-[11px] font-black capitalize text-teal-700">
                  {profile.role}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Admin Portal Entry (Conditional) ── */}
          {profile?.role === 'admin' && (
            <Pressable
              onPress={() => router.push('/admin' as any)}
              style={{
                backgroundColor: '#0F766E',
                shadowColor: '#0F766E',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.25,
                shadowRadius: 12,
                elevation: 6,
              }}
              className="mb-4 flex-row items-center justify-between rounded-[18px] px-5 py-4 active:opacity-90 border border-teal-600/30"
            >
              <View className="flex-row items-center gap-3.5">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-teal-800">
                  <Ionicons name="shield-checkmark" size={20} color="#2DD4BF" />
                </View>
                <View>
                  <Text className="text-[15px] font-black text-white">Admin Dashboard</Text>
                  <Text className="mt-0.5 text-[11px] text-teal-200">
                    Manage system users and verify orders
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#2DD4BF" />
            </Pressable>
          )}

          {/* ── Settings ── */}
          <View className="mb-4 overflow-hidden rounded-[18px] border border-slate-100 bg-white shadow-sm">
            <View className="border-b border-slate-100 px-5 py-3.5">
              <View className="flex-row items-center gap-2">
                <Ionicons name="settings" size={17} color="#0F766E" />
                <Text className="text-[13px] font-black text-slate-600">Settings</Text>
              </View>
            </View>

            {[
              { icon: 'notifications',  bg: 'bg-blue-100',   label: 'Notifications'    },
              { icon: 'lock-closed',    bg: 'bg-purple-100', label: 'Change Password'  },
              { icon: 'help-circle',    bg: 'bg-orange-100', label: 'Help & Support'   },
            ].map((item, idx, arr) => (
              <Pressable
                key={item.label}
                className={`flex-row items-center justify-between px-5 py-4 active:bg-slate-50
                  ${idx < arr.length - 1 ? 'border-b border-slate-100' : ''}`}
              >
                <View className="flex-row items-center gap-3">
                  <View className={`h-9 w-9 items-center justify-center rounded-full ${item.bg}`}>
                    <Ionicons name={item.icon as any} size={16} color="#0F172A" />
                  </View>
                  <Text className="text-[14px] font-bold text-[#0F172A]">{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color="#94A3B8" />
              </Pressable>
            ))}
          </View>

          {/* ── Logout ── */}
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

          {/* ── App info ── */}
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

      <Snackbar
        visible={!!snackbarMessage}
        message={snackbarMessage}
        tone="error"
        onHide={() => setSnackbarMessage('')}
      />
    </SafeAreaView>
  );
}