import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Header from '@/components/header';
import { Snackbar } from '@/components/snackbar';
import { fetchOrders, type Order } from '@/lib/auth-api';
import { getAccessToken } from '@/lib/auth-session';

const STATUS: Record<Order['status'], { title: string; detail: string; icon: React.ComponentProps<typeof Ionicons>['name']; tint: string; color: string }> = {
  pending: { title: 'Order received', detail: 'Your order is waiting for review.', icon: 'time-outline', tint: '#FFF7E8', color: '#B7791F' },
  verified: { title: 'Order verified', detail: 'Your order has been checked by our team.', icon: 'shield-checkmark-outline', tint: '#EEF2FF', color: '#4F46E5' },
  processing: { title: 'Order is being prepared', detail: 'Your order is moving through fulfillment.', icon: 'flask-outline', tint: '#EEF2FF', color: '#4F46E5' },
  paid: { title: 'Payment confirmed', detail: 'Payment for your order was confirmed.', icon: 'card-outline', tint: '#E8F7F2', color: '#0F766E' },
  delivered: { title: 'Order delivered', detail: 'Your order has been delivered.', icon: 'checkmark-done-outline', tint: '#E8F7F2', color: '#0F766E' },
  completed: { title: 'Order completed', detail: 'Your order is complete.', icon: 'checkmark-circle-outline', tint: '#E8F7F2', color: '#0F766E' },
  cancelled: { title: 'Order cancelled', detail: 'This order was cancelled.', icon: 'close-circle-outline', tint: '#FFF1F2', color: '#E11D48' },
  rejected: { title: 'Order needs attention', detail: 'Please review your order details or contact support.', icon: 'alert-circle-outline', tint: '#FFF1F2', color: '#E11D48' },
};

function formatActivityDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recent activity';
  return date.toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export default function NotificationsScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadActivity = useCallback(async (pullToRefresh = false) => {
    if (pullToRefresh) setRefreshing(true); else setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Please sign in to view your activity.');
      const result = await fetchOrders(token, 0, 50);
      setOrders(result.orders);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load your activity.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadActivity();
    const timer = setInterval(() => loadActivity(true), 20000);
    return () => clearInterval(timer);
  }, [loadActivity]));

  return (
    <SafeAreaView className="flex-1 bg-[#F4F8F7]">
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadActivity(true)} tintColor="#0F766E" />}
      >
        <Header title="Notifications" />
        <View className="px-5 pt-5">
          <View className="mb-5 overflow-hidden rounded-3xl bg-[#0F766E] p-5">
            <View className="absolute -right-6 -top-7 h-28 w-28 rounded-full bg-white/10" />
            <View className="mb-3 h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
              <Ionicons name="notifications-outline" size={23} color="white" />
            </View>
            <Text className="text-xl font-extrabold text-white">Your activity</Text>
            <Text className="mt-1 text-sm leading-5 text-teal-50">Order updates and account activity, all in one place.</Text>
          </View>

          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-base font-extrabold text-slate-900">Recent updates</Text>
            <Pressable onPress={() => loadActivity(true)} hitSlop={8} className="flex-row items-center">
              <Ionicons name="refresh-outline" size={15} color="#0F766E" />
              <Text className="ml-1 text-xs font-bold text-teal-700">Refresh</Text>
            </Pressable>
          </View>

          {loading ? (
            <View className="items-center rounded-2xl border border-slate-100 bg-white px-5 py-10">
              <ActivityIndicator color="#0F766E" />
              <Text className="mt-3 text-sm text-slate-500">Loading your activity…</Text>
            </View>
          ) : error && !orders.length ? (
            <View className="items-center rounded-2xl border border-slate-100 bg-white px-6 py-8">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-rose-50"><Ionicons name="cloud-offline-outline" size={23} color="#E11D48" /></View>
              <Text className="mt-3 text-base font-bold text-slate-900">Activity unavailable</Text>
              <Text className="mt-1 text-center text-sm leading-5 text-slate-500">We couldn’t load your updates. Check your connection and try again.</Text>
              <Pressable onPress={() => loadActivity()} className="mt-4 rounded-xl bg-teal-700 px-4 py-2.5"><Text className="text-sm font-bold text-white">Try again</Text></Pressable>
            </View>
          ) : orders.length ? (
            orders.map((order) => {
              const activity = STATUS[order.status];
              return (
                <Pressable key={order.order_id} onPress={() => router.push('/cart')} className="mb-3 flex-row items-start rounded-2xl border border-slate-100 bg-white p-4 active:bg-slate-50">
                  <View style={{ backgroundColor: activity.tint }} className="mr-3 h-11 w-11 items-center justify-center rounded-2xl">
                    <Ionicons name={activity.icon} size={21} color={activity.color} />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-start justify-between">
                      <Text className="flex-1 pr-2 text-sm font-extrabold text-slate-900">{activity.title}</Text>
                      <Text className="text-[10px] font-medium text-slate-400">{formatActivityDate(order.updated_at)}</Text>
                    </View>
                    <Text className="mt-1 text-xs leading-[18px] text-slate-500">{activity.detail}</Text>
                    <View className="mt-3 flex-row items-center rounded-lg bg-slate-50 px-2.5 py-2">
                      <Ionicons name="medkit-outline" size={14} color="#64748B" />
                      <Text numberOfLines={1} className="ml-1.5 flex-1 text-[11px] font-semibold text-slate-700">{order.medication_name || 'Prescription order'} · #{order.order_id}</Text>
                      <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
                    </View>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <View className="items-center rounded-2xl border border-slate-100 bg-white px-6 py-10">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-teal-50"><Ionicons name="notifications-off-outline" size={26} color="#0F766E" /></View>
              <Text className="mt-4 text-base font-extrabold text-slate-900">You’re all caught up</Text>
              <Text className="mt-1 max-w-[250px] text-center text-sm leading-5 text-slate-500">When you place an order, updates will appear here.</Text>
              <Pressable onPress={() => router.push('/orders')} className="mt-4 rounded-xl bg-teal-700 px-4 py-2.5"><Text className="text-sm font-bold text-white">Start an order</Text></Pressable>
            </View>
          )}
        </View>
      </ScrollView>
      <Snackbar visible={!!error && !!orders.length} message={error} tone="error" onHide={() => setError('')} />
    </SafeAreaView>
  );
}
