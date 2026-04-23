import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '@/components/header';
import { fetchOrders, type Order as ApiOrder } from '@/lib/auth-api';
import { getAccessToken } from '@/lib/auth-session';
import { Snackbar } from '@/components/snackbar';

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = 'Pending' | 'Processing' | 'Dispatched' | 'Delivered' | 'Cancelled';

type OrderItem = {
  id: string;
  title: string;
  type: string;
  qty: number;
  price: number;
  addedAt: Date;
  status: OrderStatus;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getApiBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }
  return 'http://100.53.230.81';
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  OrderStatus,
  { icon: React.ComponentProps<typeof Ionicons>['name']; bg: string; text: string; dot: string }
> = {
  Pending:    { icon: 'time-outline',             bg: '#FEF3C7', text: '#B45309', dot: '#F59E0B' },
  Processing: { icon: 'sync-outline',             bg: '#EDE9FE', text: '#6D28D9', dot: '#7C3AED' },
  Dispatched: { icon: 'bicycle-outline',          bg: '#DBEAFE', text: '#1D4ED8', dot: '#3B82F6' },
  Delivered:  { icon: 'checkmark-circle-outline', bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  Cancelled:  { icon: 'close-circle-outline',     bg: '#FFE4E6', text: '#BE123C', dot: '#F43F5E' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)   return `${hours} hr${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

function mapApiOrderToItem(apiOrder: ApiOrder): OrderItem {
  const statusMap: Record<string, OrderStatus> = {
    'PENDING': 'Pending',
    'PROCESSING': 'Processing',
    'DISPATCHED': 'Dispatched',
    'DELIVERED': 'Delivered',
    'CANCELLED': 'Cancelled',
  };

  return {
    id: apiOrder.order_id,
    title: apiOrder.medication_name || 'Prescription Order',
    type: 'Order',
    qty: apiOrder.quantity,
    price: 0,
    addedAt: new Date(apiOrder.created_at),
    status: (statusMap[apiOrder.status] || 'Pending') as OrderStatus,
  };
}

const MIN_FREE_DELIVERY = 100;

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <View
      style={{ backgroundColor: cfg.bg }}
      className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1"
    >
      <View style={{ backgroundColor: cfg.dot }} className="h-1.5 w-1.5 rounded-full" />
      <Ionicons name={cfg.icon} size={12} color={cfg.text} />
      <Text style={{ color: cfg.text }} className="text-[11px] font-black tracking-wide">
        {status}
      </Text>
    </View>
  );
}

// ─── QtyButton ────────────────────────────────────────────────────────────────

function QtyButton({
  icon, onPress, variant = 'default', disabled = false,
}: {
  icon: 'add' | 'remove';
  onPress: () => void;
  variant?: 'default' | 'primary';
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{ opacity: disabled ? 0.35 : 1 }}
      className={`h-8 w-8 items-center justify-center rounded-full active:opacity-70
        ${variant === 'primary' ? 'bg-teal-700' : 'bg-slate-100'}`}
    >
      <Ionicons name={icon} size={16} color={variant === 'primary' ? '#fff' : '#0F172A'} />
    </Pressable>
  );
}

// ─── CartItem ─────────────────────────────────────────────────────────────────

function CartItem({
  item, onUpdateQty, onRemove,
}: {
  item: OrderItem;
  onUpdateQty: (id: string, delta: number) => void;
  onRemove: (id: string, title: string) => void;
}) {
  const isLocked = item.status === 'Delivered' || item.status === 'Cancelled';

  return (
    <View
      className="overflow-hidden rounded-[18px] bg-white shadow-sm border border-slate-100"
      style={{ opacity: item.status === 'Cancelled' ? 0.72 : 1 }}
    >
      {/* Status accent bar */}
      <View style={{ backgroundColor: STATUS_CONFIG[item.status].dot, height: 3 }} />

      {/* Main row */}
      <View className="flex-row items-start justify-between px-4 pt-4 pb-3 gap-3">
        <View className="flex-1">
          <Text className="text-[14px] font-black text-[#0F172A]" numberOfLines={1}>
            {item.title}
          </Text>
          <View className="mt-0.5 flex-row items-center gap-2">
            <Text className="text-[11px] font-semibold text-slate-400">{item.type}</Text>
            <View className="h-1 w-1 rounded-full bg-slate-300" />
            <Text className="text-[11px] font-semibold text-slate-400">Qty: {item.qty}</Text>
          </View>
          <View className="mt-1 flex-row items-center gap-1">
            <Ionicons name="time-outline" size={11} color="#94a3b8" />
            <Text className="text-[11px] text-slate-400">{timeAgo(item.addedAt)}</Text>
          </View>
        </View>

        <StatusBadge status={item.status} />
      </View>

      {/* Footer row */}
      <View className="flex-row items-center justify-between border-t border-slate-100 px-4 py-2.5">
        <Pressable
          onPress={() => onRemove(item.id, item.title)}
          className="flex-row items-center gap-1 active:opacity-60"
          disabled={isLocked}
        >
          <Ionicons name="trash-outline" size={13} color={isLocked ? '#cbd5e1' : '#f43f5e'} />
          <Text className={`text-[11px] font-bold ${isLocked ? 'text-slate-300' : 'text-rose-500'}`}>Remove</Text>
        </Pressable>

        <View className="flex-row items-center gap-3">
          <QtyButton icon="remove" onPress={() => onUpdateQty(item.id, -1)} disabled={isLocked} />
          <Text className="w-6 text-center text-[15px] font-black text-[#0F172A]">{item.qty}</Text>
          <QtyButton icon="add" onPress={() => onUpdateQty(item.id, +1)} variant="primary" disabled={isLocked} />
        </View>
      </View>
    </View>
  );
}

// ─── CartScreen ───────────────────────────────────────────────────────────────

export default function CartScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarTone, setSnackbarTone] = useState<'success' | 'error'>('success');

  const loadOrders = useCallback(async (isMounted = () => true) => {
    setIsLoading(true);

    try {
      const token = await getAccessToken();
      if (!token) {
        if (isMounted()) {
          setOrders([]);
          setSnackbarMessage('Please sign in to view your orders');
          setSnackbarTone('error');
        }
        return;
      }

      const response = await fetchOrders(token);
      if (isMounted()) {
        const items = response.orders.map(mapApiOrderToItem);
        setOrders(items);
      }
    } catch (error) {
      if (isMounted()) {
        const message = error instanceof Error ? error.message : 'Failed to load orders';
        setSnackbarMessage(message);
        setSnackbarTone('error');
      }
    } finally {
      if (isMounted()) setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      loadOrders(() => isMounted);

      return () => {
        isMounted = false;
      };
    }, [loadOrders])
  );

  const subtotal = useMemo(
    () => orders.reduce((s, o) => s + o.qty * o.price, 0),
    [orders]
  );

  const statusCounts = useMemo(
    () =>
      orders.reduce<Partial<Record<OrderStatus, number>>>((acc, o) => {
        acc[o.status] = (acc[o.status] ?? 0) + 1;
        return acc;
      }, {}),
    [orders]
  );

  async function updateQty(id: string, delta: number) {
    const order = orders.find((o) => o.id === id);
    if (!order) return;

    const newQty = order.qty + delta;
    if (newQty < 1) return;

    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${getApiBaseUrl()}/api/v1/orders/update-quantity/${id}?quantity=${newQty}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || data?.message || 'Failed to update quantity');
      }

      // Update local state after successful backend update
      setOrders((prev) =>
        prev
          .map((o) => (o.id === id ? { ...o, qty: newQty } : o))
          .filter((o) => o.qty > 0)
      );

      setSnackbarMessage(`Quantity updated to ${newQty}`);
      setSnackbarTone('success');
    } catch (err: any) {
      const message = err?.message || 'Failed to update quantity';
      setSnackbarMessage(message);
      setSnackbarTone('error');
    }
  }

  function confirmRemove(id: string, title: string) {
    Alert.alert(
      'Remove Item',
      `Remove "${title}" from your orders?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getAccessToken();
              if (!token) throw new Error('Not authenticated');

              const response = await fetch(`${getApiBaseUrl()}/api/v1/orders/delete/${id}`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
              });

              const data = await response.json();
              if (!response.ok) {
                throw new Error(data?.detail || data?.message || 'Failed to delete order');
              }

              // Only remove from local state after successful deletion
              setOrders((prev) => prev.filter((o) => o.id !== id));
              setSnackbarMessage('Order deleted successfully');
              setSnackbarTone('success');
            } catch (err: any) {
              const message = err?.message || 'Failed to delete order';
              setSnackbarMessage(message);
              setSnackbarTone('error');
            }
          },
        },
      ],
      { cancelable: true }
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F0FDF9] items-center justify-center">
        <StatusBar style="dark" />
        <View className="items-center">
          <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-teal-100">
            <Ionicons name="cart" size={28} color="#0F766E" />
          </View>
          <Text className="text-[18px] font-black text-[#0F172A]">Loading your orders</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F0FDF9]">
      <StatusBar style="dark" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <Header
          title="Your Orders"
          subtitle={`${orders.length} order${orders.length !== 1 ? 's' : ''}`}
          showBack
        />

        <View className="px-4 pt-4">

          {/* ── Empty state ── */}
          {orders.length === 0 && (
            <View className="mt-20 items-center px-8">
              <View className="mb-5 h-24 w-24 items-center justify-center rounded-full bg-teal-50">
                <Ionicons name="cart-outline" size={44} color="#0F766E" />
              </View>
              <Text className="text-[20px] font-black text-[#0F172A]">No orders yet</Text>
              <Text className="mt-2 text-center text-[13px] leading-6 text-slate-400">
                Place your first medication order today
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/orders')}
                className="mt-6 flex-row items-center gap-2 rounded-[14px] bg-teal-700 px-6 py-3.5 active:bg-teal-800"
              >
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text className="text-[14px] font-black text-white">Order Medicines</Text>
              </Pressable>
            </View>
          )}

          {/* ── Cart items ── */}
          {orders.length > 0 && (
            <>
              {/* Status summary */}
              <View className="mb-4 flex-row flex-wrap gap-2">
                {(Object.keys(STATUS_CONFIG) as OrderStatus[])
                  .filter((s) => statusCounts[s])
                  .map((s) => {
                    const cfg = STATUS_CONFIG[s];
                    return (
                      <View
                        key={s}
                        style={{ backgroundColor: cfg.bg }}
                        className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
                      >
                        <View style={{ backgroundColor: cfg.dot }} className="h-2 w-2 rounded-full" />
                        <Text style={{ color: cfg.text }} className="text-[11px] font-black">
                          {statusCounts[s]}× {s}
                        </Text>
                      </View>
                    );
                  })}
              </View>

              {/* Items */}
              <View className="gap-3">
                {orders.map((o) => (
                  <CartItem
                    key={o.id}
                    item={o}
                    onUpdateQty={updateQty}
                    onRemove={confirmRemove}
                  />
                ))}
              </View>

              {/* Add more */}
              <Pressable
                onPress={() => router.push('/(tabs)/orders')}
                className="mt-4 flex-row items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-teal-300 bg-teal-50 py-3.5 active:bg-teal-100"
              >
                <Ionicons name="add-circle-outline" size={18} color="#0F766E" />
                <Text className="text-[13px] font-bold text-teal-700">Place New Order</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>

      <Snackbar
        visible={!!snackbarMessage}
        message={snackbarMessage}
        tone={snackbarTone}
        bottomOffset={tabBarHeight}
        onHide={() => setSnackbarMessage('')}
      />
    </SafeAreaView>
  );
}
