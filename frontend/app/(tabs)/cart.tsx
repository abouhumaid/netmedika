import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Clipboard,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '@/components/header';
import { fetchOrders, type Order as ApiOrder } from '@/lib/auth-api';
import { getApiBaseUrl, getPaymentAccount } from '@/lib/config';
import { getAccessToken } from '@/lib/auth-session';
import { Snackbar } from '@/components/snackbar';

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus =
  | 'Pending'
  | 'Processing'
  | 'Dispatched'
  | 'Delivered'
  | 'Cancelled'
  | 'Verified'   // ← admin approved, awaiting payment
  | 'Rejected';  // ← admin rejected with reason

type OrderItem = {
  id: string;
  title: string;
  type: string;
  qty: number;
  price: number;
  addedAt: Date;
  status: OrderStatus;
  rejectionReason?: string;  // ← populated when status is Rejected
};

const PAYMENT_ACCOUNT = getPaymentAccount();

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  OrderStatus,
  { icon: React.ComponentProps<typeof Ionicons>['name']; bg: string; text: string; dot: string; label: string }
> = {
  Pending:    { icon: 'time-outline',             bg: '#FEF3C7', text: '#B45309', dot: '#F59E0B', label: 'Pending' },
  Processing: { icon: 'sync-outline',             bg: '#EDE9FE', text: '#6D28D9', dot: '#7C3AED', label: 'Processing' },
  Dispatched: { icon: 'bicycle-outline',          bg: '#DBEAFE', text: '#1D4ED8', dot: '#3B82F6', label: 'Dispatched' },
  Delivered:  { icon: 'checkmark-circle-outline', bg: '#D1FAE5', text: '#065F46', dot: '#10B981', label: 'Delivered' },
  Cancelled:  { icon: 'close-circle-outline',     bg: '#FFE4E6', text: '#BE123C', dot: '#F43F5E', label: 'Cancelled' },
  Verified:   { icon: 'shield-checkmark-outline', bg: '#CCFBF1', text: '#0F766E', dot: '#14B8A6', label: 'Approved' },
  Rejected:   { icon: 'alert-circle-outline',     bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444', label: 'Rejected' },
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
    PENDING:    'Pending',
    PROCESSING: 'Processing',
    DISPATCHED: 'Dispatched',
    DELIVERED:  'Delivered',
    CANCELLED:  'Cancelled',
    VERIFIED:   'Verified',
    REJECTED:   'Rejected',
    COMPLETED:  'Delivered',
    PAID:       'Processing',
  };

  const normalizedStatus = (apiOrder.status || '').toString().toUpperCase();

  return {
    id:              apiOrder.order_id,
    title:           apiOrder.medication_name || 'Prescription Order',
    type:            'Order',
    qty:             apiOrder.quantity,
    price:           apiOrder.delivery_fee || 0,
    addedAt:         new Date(apiOrder.created_at),
    status:          (statusMap[normalizedStatus] || 'Pending') as OrderStatus,
    rejectionReason: (apiOrder as any).rejection_reason ?? undefined,
  };
}

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
        {cfg.label}
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

// ─── PaymentModal ─────────────────────────────────────────────────────────────

function PaymentModal({
  visible,
  order,
  onClose,
  onPaid,
}: {
  visible: boolean;
  order: OrderItem | null;
  onClose: () => void;
  onPaid: (orderId: string) => Promise<void>;
}) {
  const slideAnim = useRef(new Animated.Value(600)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const [isPaying, setIsPaying] = useState(false);
  const [copied, setCopied]     = useState(false);

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1, duration: 220, useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0, tension: 65, friction: 11, useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0, duration: 180, useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 600, duration: 200, useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  function copyAccountNumber() {
    Clipboard.setString(PAYMENT_ACCOUNT.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handlePaid() {
    if (!order) return;
    setIsPaying(true);
    try {
      await onPaid(order.id);
      onClose();
    } finally {
      setIsPaying(false);
    }
  }

  if (!order) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', opacity: fadeAnim }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          transform: [{ translateY: slideAnim }],
          backgroundColor: '#fff',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingBottom: Platform.OS === 'ios' ? 36 : 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 24,
        }}
      >
        {/* Handle */}
        <View className="items-center pt-3 pb-2">
          <View className="h-1 w-10 rounded-full bg-slate-200" />
        </View>

        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pb-4 border-b border-slate-100">
          <View>
            <Text className="text-[18px] font-black text-[#0F172A]">Make Payment</Text>
            <Text className="text-[12px] text-slate-400 mt-0.5" numberOfLines={1}>
              {order.title}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200"
          >
            <Ionicons name="close" size={18} color="#64748b" />
          </Pressable>
        </View>

        <View className="px-6 pt-5 gap-4">
          {/* Amount to Pay */}
          {order.price > 0 && (
            <View
              style={{
                backgroundColor: '#F0FDF9',
                borderWidth: 1.5,
                borderColor: '#99F6E4',
                borderRadius: 18,
                padding: 16,
              }}
            >
              <Text className="text-[12px] font-semibold uppercase tracking-widest text-slate-400">
                Amount to Pay
              </Text>
              <View className="flex-row items-baseline gap-2 mt-2">
                <Text className="text-[20px] font-black text-teal-700">₦{order.price.toFixed(2)}</Text>

              </View>
            </View>
          )}

          {/* Notice */}
          <View className="flex-row items-start gap-3 rounded-[14px] bg-teal-50 p-4">
            <Ionicons name="information-circle" size={20} color="#0F766E" />
            <Text className="flex-1 text-[12px] leading-5 text-teal-800 font-medium">
              Transfer the exact amount to the account below, then tap{' '}
              <Text className="font-black">I Have Paid</Text> to notify us.
            </Text>
          </View>

          {/* Account card */}
          <View
            style={{
              backgroundColor: '#F0FDF9',
              borderWidth: 1.5,
              borderColor: '#99F6E4',
              borderRadius: 18,
              padding: 20,
              gap: 16,
            }}
          >
            {/* Bank name */}
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-teal-100">
                <Ionicons name="business-outline" size={18} color="#0F766E" />
              </View>
              <View>
                <Text className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Bank
                </Text>
                <Text className="text-[14px] font-black text-[#0F172A]">
                  {PAYMENT_ACCOUNT.bankName}
                </Text>
              </View>
            </View>

            <View className="h-px bg-teal-100" />

            {/* Account name */}
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-teal-100">
                <Ionicons name="person-outline" size={18} color="#0F766E" />
              </View>
              <View>
                <Text className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Account Name
                </Text>
                <Text className="text-[14px] font-black text-[#0F172A]">
                  {PAYMENT_ACCOUNT.accountName}
                </Text>
              </View>
            </View>

            <View className="h-px bg-teal-100" />

            {/* Account number + copy */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-teal-100">
                  <Ionicons name="card-outline" size={18} color="#0F766E" />
                </View>
                <View>
                  <Text className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Account Number
                  </Text>
                  <Text className="text-[20px] font-black tracking-widest text-[#0F172A]">
                    {PAYMENT_ACCOUNT.accountNumber}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={copyAccountNumber}
                style={{
                  backgroundColor: copied ? '#D1FAE5' : '#fff',
                  borderWidth: 1.5,
                  borderColor: copied ? '#10B981' : '#CBD5E1',
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Ionicons
                  name={copied ? 'checkmark' : 'copy-outline'}
                  size={14}
                  color={copied ? '#059669' : '#64748B'}
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: copied ? '#059669' : '#64748B',
                  }}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* CTA */}
          <Pressable
            onPress={handlePaid}
            disabled={isPaying}
            style={{
              backgroundColor: isPaying ? '#5EEAD4' : '#0F766E',
              borderRadius: 16,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: isPaying ? 0.8 : 1,
            }}
          >
            {isPaying ? (
              <Ionicons name="sync-outline" size={18} color="#fff" />
            ) : (
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            )}
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 0.3 }}>
              {isPaying ? 'Confirming…' : 'I Have Paid'}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

// ─── RejectionCard ────────────────────────────────────────────────────────────

function RejectionCard({
  reason,
  onDelete,
  onReorder,
}: {
  reason: string;
  onDelete: () => void;
  onReorder: () => void;
}) {
  return (
    <View
      style={{
        borderRadius: 14,
        backgroundColor: '#FFF1F2',
        borderWidth: 1,
        borderColor: '#FECDD3',
        padding: 14,
        gap: 12,
        marginTop: 2,
      }}
    >
      <View className="flex-row items-start gap-2">
        <Ionicons name="alert-circle" size={16} color="#BE123C" style={{ marginTop: 1 }} />
        <View className="flex-1">
          <Text className="text-[11px] font-black uppercase tracking-widest text-rose-700 mb-1">
            Rejection Reason
          </Text>
          <Text className="text-[12px] leading-5 text-rose-800 font-medium">{reason}</Text>
        </View>
      </View>

      <View className="flex-row gap-2">
        <Pressable
          onPress={onDelete}
          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-[10px] bg-white border border-rose-200 py-2.5 active:bg-rose-50"
        >
          <Ionicons name="trash-outline" size={13} color="#BE123C" />
          <Text className="text-[12px] font-bold text-rose-700">Delete</Text>
        </Pressable>

        <Pressable
          onPress={onReorder}
          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-[10px] bg-teal-700 py-2.5 active:bg-teal-800"
        >
          <Ionicons name="refresh-outline" size={13} color="#fff" />
          <Text className="text-[12px] font-bold text-white">Order Again</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── CartItem ─────────────────────────────────────────────────────────────────

function CartItem({
  item,
  onUpdateQty,
  onRemove,
  onPayNow,
}: {
  item: OrderItem;
  onUpdateQty: (id: string, delta: number) => void;
  onRemove: (id: string, title: string) => void;
  onPayNow: (item: OrderItem) => void;
}) {
  const isProcessing = item.status === 'Processing';
  const isLocked     =
    item.status === 'Delivered' ||
    item.status === 'Cancelled' ||
    item.status === 'Verified' ||
    item.status === 'Rejected' ||
    isProcessing;
  const isVerified = item.status === 'Verified';
  const isRejected = item.status === 'Rejected';
  const cfg        = STATUS_CONFIG[item.status];

  return (
    <View
      className="overflow-hidden rounded-[18px] bg-white shadow-sm border border-slate-100"
      style={{ opacity: item.status === 'Cancelled' ? 0.72 : isProcessing ? 0.88 : 1 }}
    >
      {/* Status accent bar */}
      <View style={{ backgroundColor: cfg.dot, height: 3 }} />

      {/* Main row */}
      <View className="flex-row items-start justify-between px-4 pt-4 pb-3 gap-3">
        <View className="flex-1">
          <Text className="text-[14px] font-black text-[#0F172A]" numberOfLines={1}>
            {item.title}
          </Text>
          <Text className="text-[10px] font-bold text-teal-600 mt-1 tracking-wide">{item.id}</Text>
          <View className="mt-1.5 flex-row items-center gap-2">
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

      {/* Processing — verification banner */}
      {isProcessing && (
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 12,
            borderRadius: 13,
            backgroundColor: '#FEF3C7',
            paddingVertical: 12,
            paddingHorizontal: 16,
          }}
        >
          <View className="flex-row items-start gap-2">
            <Ionicons name="time-outline" size={16} color="#92400E" />
            <View className="flex-1">
              <Text className="text-[12px] font-bold text-amber-900">Payment being verified</Text>
              <Text className="mt-1 text-[11px] text-amber-800">
                Your order is currently under processing and payment verification. We will update it once review completes.
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Verified — pay now banner */}
      {isVerified && (
        <Pressable
          onPress={() => onPayNow(item)}
          style={{
            marginHorizontal: 16,
            marginBottom: 12,
            backgroundColor: '#0F766E',
            borderRadius: 13,
            paddingVertical: 12,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
          className="active:opacity-80"
        >
          <View className="flex-row items-center gap-2">
            <Ionicons name="cash-outline" size={18} color="#fff" />
            <View>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>
                Order Approved!
              </Text>
              <Text style={{ color: '#99F6E4', fontSize: 11, fontWeight: '600' }}>
                Tap to make payment
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#5EEAD4" />
        </Pressable>
      )}

      {/* Rejected — reason + actions */}
      {isRejected && item.rejectionReason && (
        <View className="px-4 pb-3">
          <RejectionCard
            reason={item.rejectionReason}
            onDelete={() => onRemove(item.id, item.title)}
            onReorder={() => router.push('/(tabs)/orders')}
          />
        </View>
      )}

      {/* Footer row — hidden for verified/rejected (actions are inline above) */}
      {!isVerified && !isRejected && !isProcessing && (
        <View className="flex-row items-center justify-between border-t border-slate-100 px-4 py-2.5">
          <Pressable
            onPress={() => onRemove(item.id, item.title)}
            className="flex-row items-center gap-1 active:opacity-60"
            disabled={isLocked}
          >
            <Ionicons name="trash-outline" size={13} color={isLocked ? '#cbd5e1' : '#f43f5e'} />
            <Text className={`text-[11px] font-bold ${isLocked ? 'text-slate-300' : 'text-rose-500'}`}>
              Remove
            </Text>
          </Pressable>

          <View className="flex-row items-center gap-3">
            <QtyButton icon="remove" onPress={() => onUpdateQty(item.id, -1)} disabled={isLocked} />
            <Text className="w-6 text-center text-[15px] font-black text-[#0F172A]">{item.qty}</Text>
            <QtyButton icon="add" onPress={() => onUpdateQty(item.id, +1)} variant="primary" disabled={isLocked} />
          </View>
        </View>
      )}
    </View>
  );
}

// ─── CartScreen ───────────────────────────────────────────────────────────────

export default function CartScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const [orders, setOrders]               = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarTone, setSnackbarTone]   = useState<'success' | 'error'>('success');
  const [paymentOrder, setPaymentOrder]   = useState<OrderItem | null>(null);
  const [paymentVisible, setPaymentVisible] = useState(false);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadOrders = useCallback(async (isMounted: () => boolean = () => true) => {
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
        setOrders(response.orders.map(mapApiOrderToItem));
      }
    } catch (error) {
      if (isMounted()) {
        setSnackbarMessage(error instanceof Error ? error.message : 'Failed to load orders');
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
      return () => { isMounted = false; };
    }, [loadOrders])
  );

  // ── Derived state ─────────────────────────────────────────────────────────

  const statusCounts = useMemo(
    () =>
      orders.reduce<Partial<Record<OrderStatus, number>>>((acc, o) => {
        acc[o.status] = (acc[o.status] ?? 0) + 1;
        return acc;
      }, {}),
    [orders]
  );

  // ── Actions ───────────────────────────────────────────────────────────────

  async function updateQty(id: string, delta: number) {
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    const newQty = order.qty + delta;
    if (newQty < 1) return;

    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(
        `${getApiBaseUrl()}/api/v1/orders/update-quantity/${id}?quantity=${newQty}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || data?.message || 'Failed to update quantity');

      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, qty: newQty } : o)).filter((o) => o.qty > 0)
      );
      setSnackbarMessage(`Quantity updated to ${newQty}`);
      setSnackbarTone('success');
    } catch (err: any) {
      setSnackbarMessage(err?.message || 'Failed to update quantity');
      setSnackbarTone('error');
    }
  }

  function confirmRemove(id: string, title: string) {
    Alert.alert(
      'Remove Order',
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
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              });
              const data = await response.json();
              if (!response.ok) throw new Error(data?.detail || data?.message || 'Failed to delete order');

              setOrders((prev) => prev.filter((o) => o.id !== id));
              setSnackbarMessage('Order deleted successfully');
              setSnackbarTone('success');
            } catch (err: any) {
              setSnackbarMessage(err?.message || 'Failed to delete order');
              setSnackbarTone('error');
            }
          },
        },
      ],
      { cancelable: true }
    );
  }

  function openPayment(item: OrderItem) {
    setPaymentOrder(item);
    setPaymentVisible(true);
  }

  /**
   * Called when the user taps "I Have Paid".
   *
   * This should update the order status on the backend from VERIFIED → PROCESSING.
   * If the network call fails, we do not force a local processing state so the
   * cart always reflects backend truth on reload.
   */
  async function handlePaymentConfirmed(orderId: string) {
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(
        `${getApiBaseUrl()}/api/v1/orders/${encodeURIComponent(orderId)}/confirm-payment`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || data?.message || 'Failed to confirm payment.');
      }

      const confirmedStatus = (data?.status || 'PROCESSING').toString().toUpperCase();
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: confirmedStatus === 'VERIFIED' ? 'Verified' : 'Processing' as OrderStatus } : o
        )
      );
      setSnackbarMessage(data?.message || 'Payment confirmed! We will process your order shortly.');
      setSnackbarTone('success');
    } catch (err: any) {
      setSnackbarMessage(err?.message || 'Unable to confirm payment. Please try again.');
      setSnackbarTone('error');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

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

          {/* ── Order list ── */}
          {orders.length > 0 && (
            <>
              {/* Status summary chips */}
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
                          {statusCounts[s]}× {cfg.label}
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
                    onPayNow={openPayment}
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

      {/* ── Payment modal ── */}
      <PaymentModal
        visible={paymentVisible}
        order={paymentOrder}
        onClose={() => setPaymentVisible(false)}
        onPaid={handlePaymentConfirmed}
      />

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
