import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Header from '@/components/header';
import { fetchAdminNotifications, markAdminNotificationRead, markAllAdminNotificationsRead, type AdminNotification } from '@/lib/auth-api';
import { getAccessToken } from '@/lib/auth-session';

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return date.toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export default function AdminNotificationsScreen() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async (pullToRefresh = false) => {
    if (pullToRefresh) setRefreshing(true); else setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Please sign in to view notifications.');
      const result = await fetchAdminNotifications(token);
      setNotifications(result.notifications ?? []);
      setUnreadCount(result.unread_count ?? 0);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadNotifications();
    return undefined;
  }, [loadNotifications]));

  async function markAllRead() {
    if (!unreadCount || markingAll) return;
    setMarkingAll(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Please sign in to view notifications.');
      await markAllAdminNotificationsRead(token);
      setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
      setUnreadCount(0);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update notifications.');
    } finally {
      setMarkingAll(false);
    }
  }

  async function openNotification(item: AdminNotification) {
    if (!item.read_at) {
      try {
        const token = await getAccessToken();
        if (!token) throw new Error('Please sign in to view notifications.');
        const updated = await markAdminNotificationRead(token, item.id);
        setNotifications((current) => current.map((notification) => notification.id === item.id ? updated : notification));
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to update notification.');
      }
    }
    if (item.kind === 'order' || item.link?.startsWith('/orders/')) {
      router.push('/admin/orders');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F4F8F7]">
      <StatusBar style="dark" />
      <Header title="Notifications" showBack />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 20, paddingBottom: 36 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadNotifications(true)} tintColor="#0F766E" />}
      >
        <View className="mb-5 overflow-hidden rounded-3xl bg-[#0F766E] p-5">
          <View className="absolute -right-6 -top-7 h-28 w-28 rounded-full bg-white/10" />
          <View className="mb-3 h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
            <Ionicons name="notifications-outline" size={23} color="white" />
          </View>
          <Text className="text-xl font-extrabold text-white">Admin notifications</Text>
          <Text className="mt-1 text-sm leading-5 text-teal-50">New orders and updates for your pharmacy.</Text>
          <View className="mt-4 flex-row items-center justify-between">
            <Text className="text-xs font-bold text-teal-50">{unreadCount} unread</Text>
            <Pressable disabled={!unreadCount || markingAll} onPress={markAllRead} className="flex-row items-center rounded-full bg-white/15 px-3 py-2 active:bg-white/25">
              {markingAll ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="checkmark-done-outline" size={15} color="#FFFFFF" />}
              <Text className="ml-1.5 text-xs font-bold text-white">Mark all read</Text>
            </Pressable>
          </View>
        </View>

        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-base font-extrabold text-slate-900">Recent updates</Text>
          <Pressable onPress={() => loadNotifications(true)} hitSlop={8} className="flex-row items-center">
            <Ionicons name="refresh-outline" size={15} color="#0F766E" />
            <Text className="ml-1 text-xs font-bold text-teal-700">Refresh</Text>
          </Pressable>
        </View>

        {loading ? (
          <View className="items-center rounded-2xl border border-slate-100 bg-white px-5 py-10">
            <ActivityIndicator color="#0F766E" />
            <Text className="mt-3 text-sm text-slate-500">Loading notifications…</Text>
          </View>
        ) : error && !notifications.length ? (
          <View className="items-center rounded-2xl border border-slate-100 bg-white px-6 py-8">
            <Ionicons name="cloud-offline-outline" size={28} color="#E11D48" />
            <Text className="mt-3 text-base font-bold text-slate-900">Notifications unavailable</Text>
            <Text className="mt-1 text-center text-sm leading-5 text-slate-500">{error}</Text>
            <Pressable onPress={() => loadNotifications()} className="mt-4 rounded-xl bg-teal-700 px-4 py-2.5">
              <Text className="text-sm font-bold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : notifications.length ? (
          notifications.map((item) => {
            const unread = !item.read_at;
            return (
              <Pressable key={item.id} onPress={() => openNotification(item)} className={`mb-3 flex-row items-start rounded-2xl border p-4 active:bg-slate-50 ${unread ? 'border-teal-100 bg-white' : 'border-slate-100 bg-white/80'}`}>
                <View className={`mr-3 h-11 w-11 items-center justify-center rounded-2xl ${unread ? 'bg-teal-50' : 'bg-slate-100'}`}>
                  <Ionicons name={item.kind === 'order' ? 'receipt-outline' : 'notifications-outline'} size={21} color={unread ? '#0F766E' : '#64748B'} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-start justify-between">
                    <Text className="flex-1 pr-2 text-sm font-extrabold text-slate-900">{item.title}</Text>
                    <Text className="text-[10px] font-medium text-slate-400">{formatDate(item.created_at)}</Text>
                  </View>
                  <Text className="mt-1 text-xs leading-[18px] text-slate-600">{item.message}</Text>
                  <View className="mt-3 flex-row items-center justify-between">
                    <Text className={`text-[10px] font-bold uppercase tracking-wide ${unread ? 'text-teal-700' : 'text-slate-400'}`}>{unread ? 'Unread' : 'Read'}</Text>
                    {item.kind === 'order' ? <Ionicons name="chevron-forward" size={15} color="#94A3B8" /> : null}
                  </View>
                </View>
              </Pressable>
            );
          })
        ) : (
          <View className="items-center rounded-2xl border border-slate-100 bg-white px-6 py-10">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-teal-50"><Ionicons name="notifications-off-outline" size={26} color="#0F766E" /></View>
            <Text className="mt-4 text-base font-extrabold text-slate-900">No notifications yet</Text>
            <Text className="mt-1 max-w-[260px] text-center text-sm leading-5 text-slate-500">New order alerts and admin updates will appear here.</Text>
          </View>
        )}
        {error && notifications.length ? <Text className="mt-2 text-center text-xs font-semibold text-rose-600">{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
