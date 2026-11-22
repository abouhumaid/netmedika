import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Header from '@/components/header';
import { getAccessToken } from '@/lib/auth-session';
import { fetchAdminNotifications, fetchAdminOrders, fetchAdminUsers, type AdminOrder } from '@/lib/auth-api';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending review', color: '#B45309', bg: '#FEF3C7' },
  verified: { label: 'Verified', color: '#0369A1', bg: '#E0F2FE' },
  processing: { label: 'Processing', color: '#4F46E5', bg: '#E0E7FF' },
  paid: { label: 'Paid', color: '#047857', bg: '#D1FAE5' },
  delivered: { label: 'Delivered', color: '#0F766E', bg: '#CCFBF1' },
  rejected: { label: 'Rejected', color: '#BE123C', bg: '#FFE4E6' },
  completed: { label: 'Completed', color: '#475569', bg: '#F1F5F9' },
  cancelled: { label: 'Cancelled', color: '#64748B', bg: '#F1F5F9' },
};

const TRACKED_STATUSES = [
  'pending',
  'verified',
  'processing',
  'paid',
  'delivered',
  'rejected',
  'completed',
  'cancelled',
];

function formatCurrency(amount: number) {
  return `₦${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatShortDate(isoString: string) {
  try {
    return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return isoString;
  }
}

async function fetchAllAdminOrders(token: string) {
  const pageSize = 100;
  const firstPage = await fetchAdminOrders(token, undefined, undefined, 0, pageSize);
  const totalOrders = firstPage.total_orders ?? firstPage.orders.length;
  const remainingPages = Math.ceil(Math.max(totalOrders - firstPage.orders.length, 0) / pageSize);

  if (!remainingPages) {
    return firstPage;
  }

  const rest = await Promise.all(
    Array.from({ length: remainingPages }, (_, index) =>
      fetchAdminOrders(token, undefined, undefined, (index + 1) * pageSize, pageSize)
    )
  );

  return {
    total_orders: totalOrders,
    orders: [...firstPage.orders, ...rest.flatMap((page) => page.orders)],
  };
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [ordersCount, setOrdersCount] = useState<number | null>(null);
  const [usersCount, setUsersCount] = useState<number | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const token = await getAccessToken();
        if (!token) throw new Error('Not authenticated');

        const [ordersRes, usersRes, notificationRes] = await Promise.all([
          fetchAllAdminOrders(token).catch(() => null),
          fetchAdminUsers(token).catch(() => null),
          fetchAdminNotifications(token).catch(() => null),
        ]);

        if (!mounted) return;
        if (ordersRes && 'total_orders' in ordersRes) {
          setOrdersCount(ordersRes.total_orders ?? ordersRes.orders?.length ?? 0);
          setOrders(ordersRes.orders ?? []);
        }
        if (usersRes && 'users' in usersRes) setUsersCount(usersRes.users.length ?? 0);
        if (notificationRes) setUnreadNotifications(notificationRes.unread_count ?? 0);
        if (!ordersRes || !usersRes) setError('Some analytics could not be refreshed.');
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load analytics');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const analytics = useMemo(() => {
    const confirmedRevenue = orders.reduce((sum, order) => (
      ['paid', 'delivered', 'completed'].includes(order.status.toLowerCase())
        ? sum + Number(order.total_amount ?? 0)
        : sum
    ), 0);
    const averageOrderValue = orders.length
      ? orders.reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0) / orders.length
      : 0;
    const statusCounts = orders.reduce<Record<string, number>>((acc, order) => {
      const status = order.status?.toLowerCase() ?? 'pending';
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, {});
    const inFulfillment = ['verified', 'processing', 'paid'].reduce(
      (sum, status) => sum + (statusCounts[status] ?? 0),
      0
    );
    const completionRate = orders.length
      ? Math.round((((statusCounts.delivered ?? 0) + (statusCounts.completed ?? 0)) / orders.length) * 100)
      : 0;
    const rejectionRate = orders.length ? Math.round(((statusCounts.rejected ?? 0) / orders.length) * 100) : 0;
    const recentOrders = [...orders]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 4);

    return { confirmedRevenue, averageOrderValue, rejectionRate, statusCounts, inFulfillment, completionRate, recentOrders };
  }, [orders]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#F0FDF9]">
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#0F766E" />
        <Text className="mt-3 text-slate-500">Loading admin dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F0FDF9]">
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Header title="Home" showAvatar avatarLabel="A" showNotifications notificationCount={unreadNotifications} compact />

        <View className="px-4 py-6">
          <View className="mb-5"></View>

          {error ? (
            <View className="mb-4 flex-row items-center rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <Ionicons name="alert-circle-outline" size={18} color="#B45309" />
              <Text className="ml-2 flex-1 text-[12px] font-semibold text-amber-700">{error}</Text>
            </View>
          ) : null}

          <View className="mb-4 flex-row gap-3">
            <View className="flex-1 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <View className="mb-3 h-9 w-9 items-center justify-center rounded-full bg-teal-50">
                <Ionicons name="receipt-outline" size={19} color="#0F766E" />
              </View>
              <Text className="text-[11px] font-black uppercase text-slate-400">Total orders</Text>
              <Text className="mt-2 text-[28px] font-black text-[#0F172A]">{ordersCount ?? '-'}</Text>
            </View>
            <View className="flex-1 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <View className="mb-3 h-9 w-9 items-center justify-center rounded-full bg-amber-50">
                <Ionicons name="time-outline" size={19} color="#D97706" />
              </View>
              <Text className="text-[11px] font-black uppercase text-slate-400">Awaiting review</Text>
              <Text className="mt-2 text-[28px] font-black text-[#0F172A]">{analytics.statusCounts.pending ?? 0}</Text>
            </View>
          </View>

          <View className="mb-4 flex-row gap-3">
            <View className="flex-1 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <View className="mb-3 h-9 w-9 items-center justify-center rounded-full bg-emerald-50">
                <Ionicons name="cube-outline" size={19} color="#4F46E5" />
              </View>
              <Text className="text-[11px] font-black uppercase text-slate-400">In fulfillment</Text>
              <Text className="mt-2 text-[28px] font-black text-[#0F172A]">{analytics.inFulfillment}</Text>
            </View>
            <View className="flex-1 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <View className="mb-3 h-9 w-9 items-center justify-center rounded-full bg-emerald-50">
                <Ionicons name="cash-outline" size={19} color="#059669" />
              </View>
              <Text className="text-[11px] font-black uppercase text-slate-400">Confirmed revenue</Text>
              <Text className="mt-2 text-[19px] font-black text-[#0F172A]">{formatCurrency(analytics.confirmedRevenue)}</Text>
            </View>
          </View>

          <View className="mb-4 flex-row gap-3">
            <View className="flex-1 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <Text className="text-[11px] font-black uppercase text-slate-400">Average order value</Text>
              <Text className="mt-2 text-[18px] font-black text-[#0F172A]">{formatCurrency(analytics.averageOrderValue)}</Text>
              <Text className="mt-1 text-[10px] font-semibold text-slate-400">All orders</Text>
            </View>
            <View className="flex-1 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <Text className="text-[11px] font-black uppercase text-slate-400">Rejection rate</Text>
              <Text className="mt-2 text-[18px] font-black text-[#0F172A]">{analytics.rejectionRate}%</Text>
              <Text className="mt-1 text-[10px] font-semibold text-slate-400">Of all orders</Text>
            </View>
          </View>

          <View className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <Text className="text-[15px] font-black text-[#0F172A]">Order Flow</Text>
                <Text className="mt-1 text-[12px] font-semibold text-slate-400">
                  {analytics.completionRate}% completion rate
                </Text>
              </View>
              <View className="h-10 w-10 items-center justify-center rounded-full bg-teal-50">
                <Ionicons name="bar-chart-outline" size={20} color="#0F766E" />
              </View>
            </View>

            {TRACKED_STATUSES.map((status) => {
              const count = analytics.statusCounts[status] ?? 0;
              const percentage = orders.length ? Math.round((count / orders.length) * 100) : 0;
              const cfg = STATUS_CONFIG[status];
              return (
                <View key={status} className="mb-3">
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-[12px] font-bold text-slate-600">{cfg.label}</Text>
                    <Text className="text-[12px] font-black text-slate-500">{count}</Text>
                  </View>
                  <View className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <View
                      className="h-2 rounded-full"
                      style={{ width: `${percentage}%`, backgroundColor: cfg.color }}
                    />
                  </View>
                </View>
              );
            })}
            <View className="mt-1 flex-row items-center justify-between border-t border-slate-100 pt-3">
              <Text className="text-[12px] font-semibold text-slate-500">Registered accounts</Text>
              <Text className="text-[14px] font-black text-[#0F172A]">{usersCount ?? '-'}</Text>
            </View>
          </View>

          <View className="rounded-2xl border border-slate-100 bg-white px-4 pt-4 shadow-sm">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-[15px] font-black text-[#0F172A]">Recent Activity</Text>
              <Ionicons name="time-outline" size={19} color="#64748B" />
            </View>

            {analytics.recentOrders.length ? (
              analytics.recentOrders.map((order) => {
                const status = order.status?.toLowerCase() ?? 'pending';
                const cfg = STATUS_CONFIG[status] ?? { label: order.status, color: '#475569', bg: '#F1F5F9' };
                return (
                  <View key={order.order_id} className="border-t border-slate-100 py-3">
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <Text className="text-[13px] font-black text-[#0F172A]" numberOfLines={1}>
                          {order.medication_name || 'Prescription order'}
                        </Text>
                        <Text className="mt-1 text-[11px] font-semibold text-slate-400">
                          {order.user_name || order.user_email || `User #${order.user_id}`} - {formatShortDate(order.created_at)}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-[12px] font-black text-[#0F172A]">
                          {formatCurrency(Number(order.total_amount ?? 0))}
                        </Text>
                        <View className="mt-2 rounded-full px-2 py-1" style={{ backgroundColor: cfg.bg }}>
                          <Text className="text-[10px] font-black" style={{ color: cfg.color }}>
                            {cfg.label}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text className="border-t border-slate-100 py-4 text-[12px] font-semibold text-slate-400">
                No order activity is available yet.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
