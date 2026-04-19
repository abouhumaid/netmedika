import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

import Header from '@/components/header';
import { fetchProfile, logoutUser, type UserProfile } from '@/lib/auth-api';
import { clearAuthSession, getAccessToken } from '@/lib/auth-session';
import { Snackbar } from '@/components/snackbar';
import { setPendingFlashToast } from '@/lib/flash-toast';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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
          router.replace('/login');
          return;
        }

        const userProfile = await fetchProfile(accessToken);

        if (isMounted) {
          setProfile(userProfile);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to load your profile right now.';

        const isAuthError = /401|403|unauthoriz|invalid token|expired/i.test(message || '');

        if (isAuthError) {
          await clearAuthSession();

          setPendingFlashToast({
            message: message || 'Your session expired. Please sign in again.',
            tone: 'error',
          });

          if (isMounted) {
            router.replace('/login');
          }
        } else {
          setSnackbarMessage(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleLogout() {
    try {
      setIsLoggingOut(true);
      const accessToken = await getAccessToken();

      if (accessToken) {
        await logoutUser(accessToken);
      }
    } catch {
      // Clear local session even if backend logout fails.
    } finally {
      await clearAuthSession();
      router.replace('/login');
      setIsLoggingOut(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#F4FFFC] px-6">
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#0F766E" />
        <Text className="mt-3 text-lg font-bold text-slate-900">Loading your profile...</Text>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#F4FFFC] px-6">
        <StatusBar style="dark" />
        <Text className="text-lg font-bold text-slate-900">Unable to load profile</Text>
        <Pressable
          onPress={() => router.replace('/login')}
          className="mt-4 rounded-[14px] bg-blue-500 px-5 py-3 shadow-md"
        >
          <Text className="text-base font-black text-white">Return to Login</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const firstLetter = (profile?.username || 'U').charAt(0).toUpperCase();

  return (
    <SafeAreaView className="flex-1 bg-gradient-to-b from-[#F4FFFC] to-[#ECFDF5]">
      <StatusBar style="dark" />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <Header title="My Account" subtitle="Profile Settings" showBack />
        
        <View className="mx-auto w-full max-w-[560px] px-4 pb-8 pt-6 sm:px-5">
          
          {/* ── Avatar & Username ── */}
          <View className="mb-6 items-center">
            <View className="mb-4 h-24 w-24 items-center justify-center rounded-full border-4 border-teal-500 bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg">
              <Text className="text-5xl font-black text-white">{firstLetter}</Text>
            </View>
            <Text className="text-2xl font-black text-slate-900">{profile?.username}</Text>
            <Text className="mt-1 text-sm text-slate-500 capitalize">@{profile?.username.toLowerCase()}</Text>
          </View>

          {/* ── Profile Information ── */}
          <View className="mb-6 rounded-[18px] bg-white shadow-sm border border-slate-100 overflow-hidden">
            {/* Full Name / Username */}
            <View className="flex-row items-center justify-between border-b border-slate-100 px-5 py-4">
              <View className="flex-1">
                <Text className="text-[11px] font-bold uppercase tracking-[0.6px] text-slate-400">Username</Text>
                <Text className="mt-1.5 text-[16px] font-bold text-slate-900">{profile?.username}</Text>
              </View>
              <Pressable className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200">
                <Ionicons name="pencil" size={16} color="#0F766E" />
              </Pressable>
            </View>

            {/* Email */}
            <View className="flex-row items-center justify-between px-5 py-4">
              <View className="flex-1">
                <Text className="text-[11px] font-bold uppercase tracking-[0.6px] text-slate-400">📧 Email</Text>
                <Text className="mt-1.5 text-[14px] font-bold text-slate-900">{profile?.email}</Text>
              </View>
              <Pressable className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200">
                <Ionicons name="pencil" size={16} color="#0F766E" />
              </Pressable>
            </View>
          </View>

          {/* ── Account Details ── */}
          <View className="mb-6 rounded-[18px] bg-white shadow-sm border border-slate-100 px-5 py-4">
            <View className="flex-row items-center gap-2 mb-3">
              <Ionicons name="shield-checkmark" size={18} color="#0F766E" />
              <Text className="text-[13px] font-black text-slate-600">Account Information</Text>
            </View>
            <View className="mt-3 flex-row items-center justify-between">
              <Text className="text-[12px] text-slate-500">Account Role</Text>
              <View className="rounded-full bg-teal-100 px-3 py-1">
                <Text className="text-[11px] font-black capitalize text-teal-700">{profile?.role}</Text>
              </View>
            </View>
          </View>

          {/* ── Settings ── */}
          <View className="mb-6 rounded-[18px] bg-white shadow-sm border border-slate-100 overflow-hidden">
            <View className="border-b border-slate-100 px-5 py-3">
              <View className="flex-row items-center gap-2">
                <Ionicons name="settings" size={18} color="#0F766E" />
                <Text className="text-[13px] font-black text-slate-600">Settings</Text>
              </View>
            </View>
            
            <Pressable className="flex-row items-center justify-between border-b border-slate-100 px-5 py-4 active:bg-slate-50">
              <View className="flex-row items-center gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-blue-100">
                  <Ionicons name="notifications" size={16} color="#0F172A" />
                </View>
                <Text className="text-[14px] font-bold text-slate-900">Notifications</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </Pressable>

            <Pressable className="flex-row items-center justify-between border-b border-slate-100 px-5 py-4 active:bg-slate-50">
              <View className="flex-row items-center gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-purple-100">
                  <Ionicons name="lock-closed" size={16} color="#0F172A" />
                </View>
                <Text className="text-[14px] font-bold text-slate-900">Change Password</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </Pressable>

            <Pressable className="flex-row items-center justify-between px-5 py-4 active:bg-slate-50">
              <View className="flex-row items-center gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-orange-100">
                  <Ionicons name="help-circle" size={16} color="#0F172A" />
                </View>
                <Text className="text-[14px] font-bold text-slate-900">Help & Support</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </Pressable>
          </View>

          {/* ── Logout Button ── */}
          <Pressable
            onPress={handleLogout}
            disabled={isLoggingOut}
            className={`mb-6 items-center rounded-[14px] px-5 py-4 flex-row justify-center gap-2 ${
              isLoggingOut ? 'bg-slate-200' : 'bg-red-500 shadow-md'
            }`}
          >
            {isLoggingOut ? (
              <ActivityIndicator size="small" color="#94A3B8" />
            ) : (
              <Ionicons name="log-out" size={18} color="#fff" />
            )}
            <Text className={`${isLoggingOut ? 'text-slate-400' : 'text-white'} text-base font-black`}>
              {isLoggingOut ? 'Signing Out...' : 'Log Out'}
            </Text>
          </Pressable>

          {/* ── App Info ── */}
          <View className="rounded-[14px] bg-slate-100 px-4 py-3.5">
            <View className="flex-row items-center justify-center gap-2 mb-2">
              <Ionicons name="information-circle" size={16} color="#64748B" />
              <Text className="text-[12px] font-bold text-slate-600">App Information</Text>
            </View>
            <View className="flex-row items-center justify-center gap-2">
              <Text className="text-[11px] text-slate-500">NetMedika</Text>
              <View className="h-1 w-1 rounded-full bg-slate-400" />
              <Text className="text-[11px] font-bold text-slate-600">v{appVersion}</Text>
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
