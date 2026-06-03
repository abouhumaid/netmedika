import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Animated,
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '@/components/header';
import {
  fetchAdminOrders,
  reviewOrder,
  confirmPaymentReceipt,
  updateOrderStatus,
  type AdminOrder,
} from '@/lib/auth-api';

const TEAL = '#0F766E';

type AdminOrdersProps = {
  accessToken: string;
  onOpenDrawer?: () => void;
  setGlobalError: (msg: string) => void;
  setGlobalSuccess: (msg: string) => void;
};

// Map backend status to human labels and premium colors
const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; bg: string; text: string; dot: string }
> = {
  pending:    { label: 'Pending Review', icon: 'time-outline',             bg: '#FEF3C7', text: '#D97706', dot: '#F59E0B' },
  verified:   { label: 'Awaiting Payment', icon: 'card-outline',            bg: '#CCFBF1', text: '#0F766E', dot: '#14B8A6' },
  rejected:   { label: 'Rejected',       icon: 'close-circle-outline',     bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
  processing: { label: 'Paid Verification', icon: 'sync-outline',             bg: '#EDE9FE', text: '#6D28D9', dot: '#7C3AED' },
  paid:       { label: 'Paid & Confirmed', icon: 'checkmark-done-circle', bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  delivered:  { label: 'Dispatched / Delivery', icon: 'bicycle-outline',          bg: '#DBEAFE', text: '#1D4ED8', dot: '#3B82F6' },
  completed:  { label: 'Completed',      icon: 'checkmark-circle',         bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  cancelled:  { label: 'Cancelled',      icon: 'ban-outline',              bg: '#E2E8F0', text: '#475569', dot: '#64748B' },
};

const LIFECYCLE_STATUS_OPTIONS = [
  { status: 'processing', label: 'Payment Verification', icon: 'sync-outline' },
  { status: 'paid', label: 'Paid & Confirmed', icon: 'checkmark-done-circle-outline' },
  { status: 'delivered', label: 'Dispatch / In Delivery', icon: 'bicycle-outline' },
  { status: 'completed', label: 'Delivered & Completed', icon: 'checkmark-circle-outline' },
  { status: 'cancelled', label: 'Cancel Order', icon: 'ban-outline' },
] as const;

type LifecycleStatus = (typeof LIFECYCLE_STATUS_OPTIONS)[number]['status'];

function getApiBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) return envUrl.replace(/\/$/, '');
  return 'http://100.53.230.81';
}

function formatDateTime(isoString: string) {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export default function AdminOrders({
  accessToken,
  setGlobalError,
  setGlobalSuccess,
}: AdminOrdersProps) {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState('all');

  // Selected order details modal
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  // Review sub-actions
  const [acceptingVisible, setAcceptingVisible] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState('');
  const [rejectingVisible, setRejectingVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Status transitions options list
  const [statusSelectorVisible, setStatusSelectorVisible] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<LifecycleStatus | null>(null);

  // Load orders
  const loadOrders = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      try {
        const response = await fetchAdminOrders(
          accessToken,
          activeStatusFilter === 'all' ? undefined : activeStatusFilter,
          search
        );
        setOrders(response.orders);
      } catch (err: any) {
        setGlobalError(err?.message ?? 'Failed to fetch orders.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, activeStatusFilter, search, setGlobalError]
  );

  // Trigger loading on filter changes and debounce search changes.
  useEffect(() => {
    const timeout = setTimeout(() => loadOrders(true), search.trim() ? 350 : 0);
    return () => clearTimeout(timeout);
  }, [loadOrders, search]);

  // Debounced/Triggered search
  const handleSearchSubmit = () => {
    Keyboard.dismiss();
    loadOrders(true);
  };

  // Perform review accept
  const handleAccept = async () => {
    if (!selectedOrder) return;
    const fee = parseFloat(deliveryFee);
    if (isNaN(fee) || fee < 0) {
      setGlobalError('Please enter a valid delivery fee (0 or positive).');
      return;
    }

    setActionLoading(true);
    try {
      const res = await reviewOrder(accessToken, selectedOrder.order_id, 'accept', fee);
      setGlobalSuccess(res.message || 'Order accepted and approved successfully!');
      
      // Update local item
      const updatedOrder = res.order;
      setOrders((prev) => prev.map((o) => (o.order_id === updatedOrder.order_id ? updatedOrder : o)));
      setSelectedOrder(updatedOrder);
      setAcceptingVisible(false);
      setDeliveryFee('');
    } catch (err: any) {
      setGlobalError(err?.message ?? 'Failed to accept order.');
    } finally {
      setActionLoading(false);
    }
  };

  // Perform review reject
  const handleReject = async () => {
    if (!selectedOrder) return;
    if (!rejectionReason.trim()) {
      setGlobalError('Rejection reason is required.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await reviewOrder(accessToken, selectedOrder.order_id, 'reject', undefined, rejectionReason.trim());
      setGlobalSuccess(res.message || 'Order rejected successfully!');
      
      // Update local item
      const updatedOrder = res.order;
      setOrders((prev) => prev.map((o) => (o.order_id === updatedOrder.order_id ? updatedOrder : o)));
      setSelectedOrder(updatedOrder);
      setRejectingVisible(false);
      setRejectionReason('');
    } catch (err: any) {
      setGlobalError(err?.message ?? 'Failed to reject order.');
    } finally {
      setActionLoading(false);
    }
  };

  // Perform Payment receipt confirmation (PROCESSING -> PAID)
  const handleConfirmPaymentReceipt = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const res = await confirmPaymentReceipt(accessToken, selectedOrder.order_id);
      setGlobalSuccess(res.message || 'Payment confirmed and order marked as Paid.');
      
      const updatedOrder = res.order;
      setOrders((prev) => prev.map((o) => (o.order_id === updatedOrder.order_id ? updatedOrder : o)));
      setSelectedOrder(updatedOrder);
    } catch (err: any) {
      setGlobalError(err?.message ?? 'Failed to confirm payment receipt.');
    } finally {
      setActionLoading(false);
    }
  };

  // Direct status transition (e.g. PAID -> DELIVERED -> COMPLETED)
  const handleUpdateStatus = async (newStatus: LifecycleStatus) => {
    if (!selectedOrder) return;
    if (selectedOrder.status.toLowerCase() === newStatus) return;

    setActionLoading(true);
    setUpdatingStatus(newStatus);
    try {
      const res = await updateOrderStatus(accessToken, selectedOrder.order_id, newStatus);
      setGlobalSuccess(res.message || `Status updated to ${newStatus} successfully!`);
      
      const updatedOrder = res.order;
      setOrders((prev) => prev.map((o) => (o.order_id === updatedOrder.order_id ? updatedOrder : o)));
      setSelectedOrder(updatedOrder);
      setStatusSelectorVisible(false);
    } catch (err: any) {
      setGlobalError(err?.message ?? 'Failed to update order status.');
    } finally {
      setActionLoading(false);
      setUpdatingStatus(null);
    }
  };

  // Human status helper
  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    const cfg = STATUS_CONFIG[s] || { label: status, bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' };
    return (
      <View style={{ backgroundColor: cfg.bg }} className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1">
        <View style={{ backgroundColor: cfg.dot }} className="h-1.5 w-1.5 rounded-full" />
        <Text style={{ color: cfg.text }} className="text-[11px] font-black uppercase tracking-[0.5px]">
          {cfg.label}
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#F0FDF9]">
      <Header title="Orders" showBack={false} />

      {/* Filter Tabs & Search section */}
      <View className="bg-white border-b border-slate-100 shadow-sm">
        {/* Search bar */}
        <View className="px-4 pt-3 pb-2 flex-row gap-2">
          <View className="flex-1 flex-row items-center rounded-full bg-slate-100 px-4 py-2 border border-slate-200">
            <Ionicons name="search-outline" size={16} color="#94A3B8" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search ID, Med, Patient, Address..."
              placeholderTextColor="#94A3B8"
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
              className="ml-2 flex-1 text-[13px] font-semibold text-[#0F172A]"
            />
            {search.length > 0 && (
              <Pressable
                onPress={() => {
                  setSearch('');
                }}
              >
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </Pressable>
            )}
          </View>
          <Pressable
            onPress={handleSearchSubmit}
            className="rounded-full bg-teal-800 px-5 py-2.5 active:bg-teal-900 justify-center"
          >
            <Text className="text-[12px] font-black text-white uppercase">Search</Text>
          </Pressable>
        </View>

        {/* Horizontal scroll status tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-4 py-2.5"
          contentContainerStyle={{ gap: 8, paddingRight: 32 }}
        >
          {[
            { key: 'all', label: 'All Orders' },
            { key: 'pending', label: 'Pending Review' },
            { key: 'verified', label: 'Verified / Unpaid' },
            { key: 'paid', label: 'Paid & Confirmed' },
            { key: 'delivered', label: 'Dispatched' },
            { key: 'rejected', label: 'Rejected' },
          ].map((tab) => {
            const isActive = activeStatusFilter === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveStatusFilter(tab.key)}
                className={`rounded-full px-4 py-1.5 border
                  ${isActive ? 'bg-teal-800 border-teal-800' : 'bg-slate-50 border-slate-200 active:bg-slate-100'}`}
              >
                <Text className={`text-[12px] font-bold ${isActive ? 'text-white' : 'text-slate-600'}`}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Main orders list */}
      {loading && orders.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <AnimatedPulseIcon color={TEAL} />
              <Text className="mt-3 text-[14px] text-slate-400 font-semibold">Loading orders...</Text>
            </View>
          ) : (
          <FlatList
          data={orders}
          keyExtractor={(item) => item.order_id}
          onRefresh={() => {
            setRefreshing(true);
            loadOrders(false);
          }}
          refreshing={refreshing}
          contentContainerStyle={{ padding: 12, paddingBottom: (insets.bottom || 12) + 32, gap: 12 }}
          ListEmptyComponent={
            <View className="items-center py-20 bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-slate-50 mb-4">
                <Ionicons name="receipt-outline" size={28} color="#94A3B8" />
              </View>
              <Text className="text-[16px] font-black text-[#0F172A]">No orders found</Text>
              <Text className="mt-1 text-center text-[12px] text-slate-400 max-w-[240px]">
                There are no matching orders under the current filter or search criteria.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const status = item.status.toLowerCase();
            return (
              <Pressable
                onPress={() => {
                  setSelectedOrder(item);
                  setDetailsVisible(true);
                }}
                className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm active:opacity-90"
              >
                {/* Status indicator line */}
                <View
                  style={{
                    backgroundColor: STATUS_CONFIG[status]?.dot ?? '#94A3B8',
                    height: 3,
                  }}
                />

                <View className="p-4">
                  {/* Order header row */}
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center gap-1.5">
                      <Ionicons name="receipt" size={13} color={TEAL} />
                      <Text className="text-[12px] font-black text-slate-700 tracking-wide">{item.order_id}</Text>
                    </View>
                    {getStatusBadge(item.status)}
                  </View>

                  {/* Order title / medication */}
                  <Text className="text-[15px] font-black text-[#0F172A]" numberOfLines={1}>
                    {item.medication_name || 'Uploaded Prescription Only'}
                  </Text>

                  {/* Patient username & placed time */}
                  <View className="mt-2.5 flex-row items-center gap-2">
                    <Ionicons name="person-outline" size={12} color="#64748B" />
                    <Text className="text-[12px] font-bold text-slate-500">
                      Patient: {item.user_name ?? `ID ${item.user_id}`}
                    </Text>
                    <View className="h-1 w-1 rounded-full bg-slate-300" />
                    <Ionicons name="time-outline" size={12} color="#64748B" />
                    <Text className="text-[12px] text-slate-400">{formatDateTime(item.created_at)}</Text>
                  </View>

                  {/* Row showing dosage form and amount details */}
                  <View className="mt-3 flex-row items-center justify-between border-t border-slate-50 pt-2.5">
                    <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {item.dosage_form ? `${item.dosage_form} • ` : ''}Qty: {item.quantity}
                    </Text>

                    {(item.total_amount ?? 0) > 0 && (
                      <Text className="text-[14px] font-black text-teal-800">
                        ₦{(item.total_amount ?? 0).toFixed(2)}
                      </Text>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* DETAILED ORDER MODAL */}
      <Modal
        visible={detailsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!acceptingVisible && !rejectingVisible) setDetailsVisible(false);
        }}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-[28px] max-h-[90%] overflow-hidden">
            {/* Modal header bar */}
            <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
              <View>
                <Text className="text-[18px] font-black text-[#0F172A]">Order Review</Text>
                <Text className="text-[12px] text-slate-400 mt-0.5">{selectedOrder?.order_id}</Text>
              </View>
              <Pressable
                onPress={() => setDetailsVisible(false)}
                className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200"
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </Pressable>
            </View>

            {/* Scrollable details contents */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
            >
              {selectedOrder && (
                <View className="gap-5">
                  {/* Status header summary */}
                  <View className="flex-row items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <View>
                      <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Order Lifecycle Status
                      </Text>
                      <Text className="mt-1 text-[16px] font-black text-slate-800 capitalize">
                        {STATUS_CONFIG[selectedOrder.status.toLowerCase()]?.label ?? selectedOrder.status}
                      </Text>
                    </View>
                    {getStatusBadge(selectedOrder.status)}
                  </View>

                  {/* Patient Info Section */}
                  <View className="gap-2">
                    <Text className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Patient Details
                    </Text>
                    <View className="rounded-2xl border border-slate-100 p-4 gap-2.5">
                      <View className="flex-row items-center gap-2">
                        <Ionicons name="person" size={15} color={TEAL} />
                        <Text className="text-[14px] font-black text-[#0F172A]">
                          {selectedOrder.user_name ?? `User #${selectedOrder.user_id}`}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-2">
                        <Ionicons name="mail" size={14} color="#64748B" />
                        <Text className="text-[13px] font-semibold text-slate-500">
                          {selectedOrder.user_email ?? 'No email available'}
                        </Text>
                      </View>
                      <View className="flex-row items-start gap-2 border-t border-slate-50 pt-2.5">
                        <Ionicons name="location" size={15} color="#F43F5E" style={{ marginTop: 1 }} />
                        <Text className="flex-1 text-[13px] leading-5 text-slate-600 font-medium">
                          {selectedOrder.delivery_address || 'No delivery address provided (Prescription only)'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Medication Details Section */}
                  <View className="gap-2">
                    <Text className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Medication Requested
                    </Text>
                    <View className="rounded-2xl border border-slate-100 p-4 gap-3">
                      <View>
                        <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Medicine Name
                        </Text>
                        <Text className="mt-1 text-[16px] font-black text-[#0F172A]">
                          {selectedOrder.medication_name || 'Uploaded Prescription File'}
                        </Text>
                      </View>
                      <View className="flex-row justify-between pt-2 border-t border-slate-50">
                        {selectedOrder.dosage_form && (
                          <View>
                            <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              Dosage Form
                            </Text>
                            <Text className="mt-0.5 text-[13px] font-bold text-slate-700 capitalize">
                              {selectedOrder.dosage_form}
                            </Text>
                          </View>
                        )}
                        <View>
                          <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Quantity Requested
                          </Text>
                          <Text className="mt-0.5 text-[13px] font-bold text-slate-700">
                            {selectedOrder.quantity} item(s)
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Prescription image preview if present */}
                  {selectedOrder.prescription_image && (
                    <View className="gap-2">
                      <Text className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                        Attached Prescription Image
                      </Text>
                      <View className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                        <Image
                          source={{ uri: `${getApiBaseUrl()}/${selectedOrder.prescription_image}` }}
                          style={{ width: '100%', height: 280 }}
                          resizeMode="contain"
                        />
                        <View className="bg-slate-900/80 px-4 py-3 flex-row items-center justify-between">
                          <Text className="text-[11px] font-bold text-white tracking-wide">
                            Verification Attachment
                          </Text>
                          <Pressable
                            onPress={() => {
                              // Standard browser link opening logic
                              if (Platform.OS === 'web') {
                                window.open(`${getApiBaseUrl()}/${selectedOrder.prescription_image}`, '_blank');
                              }
                            }}
                            className="flex-row items-center gap-1 rounded-md bg-teal-600 px-3 py-1 active:bg-teal-700"
                          >
                            <Ionicons name="expand-outline" size={12} color="#fff" />
                            <Text className="text-[10px] font-black text-white uppercase">Open Full</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  )}

                  {((selectedOrder.delivery_fee ?? 0) > 0 || (selectedOrder.total_amount ?? 0) > 0) && (
                    <View className="gap-2">
                      <Text className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                        Pricing Breakdown
                      </Text>
                      <View className="rounded-2xl border border-slate-100 bg-teal-50/40 p-4 gap-2">
                        <View className="flex-row justify-between items-center">
                          <Text className="text-[13px] font-semibold text-slate-500">Delivery Fee</Text>
                          <Text className="text-[14px] font-black text-slate-700">
                            ₦{(selectedOrder.delivery_fee ?? 0).toFixed(2)}
                          </Text>
                        </View>
                        <View className="h-px bg-slate-100 my-1" />
                        <View className="flex-row justify-between items-center">
                          <Text className="text-[14px] font-black text-teal-800">Total Charged</Text>
                          <Text className="text-[18px] font-black text-teal-700">
                            ₦{(selectedOrder.total_amount ?? 0).toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Rejection reason banner */}
                  {selectedOrder.status.toLowerCase() === 'rejected' && selectedOrder.rejection_reason && (
                    <View className="flex-row items-start gap-3 rounded-2xl bg-rose-50 border border-rose-100 p-4">
                      <Ionicons name="alert-circle" size={20} color="#BE123C" style={{ marginTop: 2 }} />
                      <View className="flex-1">
                        <Text className="text-[11px] font-black uppercase tracking-widest text-rose-700 mb-1">
                          Rejection Reason
                        </Text>
                        <Text className="text-[13px] leading-5 text-rose-800 font-medium">
                          {selectedOrder.rejection_reason}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* ADMIN ACTION CONTROLS */}
                  <View className="border-t border-slate-100 pt-5 gap-3">
                    {/* Decision flow for PENDING orders */}
                    {selectedOrder.status.toLowerCase() === 'pending' && (
                      <View className="gap-3">
                        <Pressable
                          onPress={() => setAcceptingVisible(true)}
                          disabled={actionLoading}
                          className="flex-row items-center justify-center gap-2 rounded-[16px] bg-teal-700 py-4 active:bg-teal-800"
                          style={{
                            shadowColor: '#0F766E',
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 0.3,
                            shadowRadius: 12,
                            elevation: 4,
                          }}
                        >
                          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                          <Text className="text-[15px] font-black text-white uppercase tracking-wide">
                            Approve (Set Delivery Fee)
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => setRejectingVisible(true)}
                          disabled={actionLoading}
                          className="flex-row items-center justify-center gap-2 rounded-[16px] bg-rose-50 border border-rose-200 py-3.5 active:bg-rose-100"
                        >
                          <Ionicons name="close-circle-outline" size={20} color="#BE123C" />
                          <Text className="text-[14px] font-black text-rose-700 uppercase tracking-wide">
                            Reject Prescription / Order
                          </Text>
                        </Pressable>
                      </View>
                    )}

                    {/* Decision flow for PROCESSING (paid awaiting verify) orders */}
                    {selectedOrder.status.toLowerCase() === 'processing' && (
                      <Pressable
                        onPress={handleConfirmPaymentReceipt}
                        disabled={actionLoading}
                        className="flex-row items-center justify-center gap-2 rounded-[16px] bg-teal-700 py-4 active:bg-teal-800"
                        style={{
                          shadowColor: '#0F766E',
                          shadowOffset: { width: 0, height: 6 },
                          shadowOpacity: 0.3,
                          shadowRadius: 12,
                          elevation: 4,
                        }}
                      >
                        {actionLoading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Ionicons name="checkbox-outline" size={20} color="#fff" />
                        )}
                        <Text className="text-[15px] font-black text-white uppercase tracking-wide">
                          Confirm Payment Receipt (Mark PAID)
                        </Text>
                      </Pressable>
                    )}

                    {/* Transition options backed by the admin status API */}
                    {!['pending', 'rejected', 'completed', 'cancelled'].includes(selectedOrder.status.toLowerCase()) && (
                      <Pressable
                        onPress={() => setStatusSelectorVisible(true)}
                        disabled={actionLoading}
                        className="flex-row items-center justify-center gap-2 rounded-[16px] bg-slate-800 py-4 active:bg-slate-900"
                      >
                        <Ionicons name="options-outline" size={20} color="#fff" />
                        <Text className="text-[14px] font-black text-white uppercase tracking-wide">
                          Update Status
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* SUB-MODAL: ACCEPT SET DELIVERY FEE */}
      <Modal visible={acceptingVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="bg-white rounded-[24px] p-6 w-full max-w-[340px] shadow-xl">
            <View className="flex-row items-center gap-2.5 mb-2">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-teal-50">
                <Ionicons name="cash" size={18} color={TEAL} />
              </View>
              <Text className="text-[16px] font-black text-[#0F172A]">Approve Order</Text>
            </View>
            <Text className="text-[12px] text-slate-400 mb-4">
              Enter the delivery fee in Naira (₦) for this order. This fee will be shown to the patient.
            </Text>

            <View className="flex-row items-center rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2.5 mb-5 focus-within:border-teal-500">
              <Text className="text-[16px] font-black text-slate-400 mr-1.5">₦</Text>
              <TextInput
                value={deliveryFee}
                onChangeText={setDeliveryFee}
                placeholder="e.g. 1500"
                keyboardType="numeric"
                returnKeyType="done"
                className="flex-1 text-[16px] font-bold text-[#0F172A]"
              />
            </View>

            <View className="flex-row gap-3">
              <Pressable
                onPress={() => {
                  setAcceptingVisible(false);
                  setDeliveryFee('');
                }}
                className="flex-1 rounded-xl bg-slate-100 py-3 active:bg-slate-200"
              >
                <Text className="text-center text-[12px] font-black text-slate-600 uppercase">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleAccept}
                disabled={actionLoading}
                className="flex-1 rounded-xl bg-teal-700 py-3 active:bg-teal-800 justify-center"
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-center text-[12px] font-black text-white uppercase">Approve</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* SUB-MODAL: REJECT ENTER REASON */}
      <Modal visible={rejectingVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="bg-white rounded-[24px] p-6 w-full max-w-[340px] shadow-xl">
            <View className="flex-row items-center gap-2.5 mb-2">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-rose-50">
                <Ionicons name="alert-circle" size={18} color="#BE123C" />
              </View>
              <Text className="text-[16px] font-black text-[#0F172A]">Reject Order</Text>
            </View>
            <Text className="text-[12px] text-slate-400 mb-4">
              Please provide a clear reason explaining why this order or prescription was rejected.
            </Text>

            <View className="rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2.5 mb-5">
              <TextInput
                value={rejectionReason}
                onChangeText={setRejectionReason}
                placeholder="e.g. Prescription photo is blurry / Out of stock"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="min-h-[70px] text-[13px] font-semibold text-[#0F172A]"
              />
            </View>

            <View className="flex-row gap-3">
              <Pressable
                onPress={() => {
                  setRejectingVisible(false);
                  setRejectionReason('');
                }}
                className="flex-1 rounded-xl bg-slate-100 py-3 active:bg-slate-200"
              >
                <Text className="text-center text-[12px] font-black text-slate-600 uppercase">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleReject}
                disabled={actionLoading}
                className="flex-1 rounded-xl bg-rose-600 py-3 active:bg-rose-700 justify-center"
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-center text-[12px] font-black text-white uppercase">Reject</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* LIFECYCLE STATUS SELECTION LIST */}
      <Modal visible={statusSelectorVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="bg-white rounded-[24px] p-5 w-full max-w-[300px] shadow-xl">
            <Text className="text-[15px] font-black text-[#0F172A] mb-1.5 px-1">Change Order Status</Text>
            <Text className="text-[11px] text-slate-400 mb-4 px-1">
              Manually override status to progress the logistics lifecycle.
            </Text>

            <View className="gap-2.5 mb-4">
              {LIFECYCLE_STATUS_OPTIONS.map((opt) => {
                const isCurrent = selectedOrder?.status.toLowerCase() === opt.status;
                const isUpdatingThisStatus = updatingStatus === opt.status;
                return (
                  <Pressable
                    key={opt.status}
                    onPress={() => handleUpdateStatus(opt.status)}
                    disabled={actionLoading || isCurrent}
                    style={{ backgroundColor: isCurrent ? '#F0FDF9' : undefined }}
                    className={`flex-row items-center justify-between rounded-xl border px-4 py-3 active:bg-slate-50
                      ${isCurrent ? 'border-teal-500' : 'border-slate-100'}`}
                  >
                    <View className="flex-1 flex-row items-center gap-2">
                      <Ionicons
                        name={opt.icon as any}
                        size={17}
                        color={isCurrent ? TEAL : opt.status === 'cancelled' ? '#BE123C' : '#64748B'}
                      />
                      <Text className={`text-[13px] font-bold ${isCurrent ? 'text-teal-700' : 'text-[#0F172A]'}`}>
                        {opt.label}
                      </Text>
                    </View>
                    {isUpdatingThisStatus ? (
                      <ActivityIndicator size="small" color={TEAL} />
                    ) : isCurrent ? (
                      <Ionicons name="checkmark-circle" size={18} color={TEAL} />
                    ) : (
                      <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                    )}
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => setStatusSelectorVisible(false)}
              className="rounded-xl bg-slate-100 py-3 active:bg-slate-200"
            >
              <Text className="text-center text-[12px] font-black text-slate-600 uppercase">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Animated pulsing icon used during loading ───────────────────────────────
function AnimatedPulseIcon({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.18, duration: 700, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }} className="items-center justify-center">
      <View style={{ shadowColor: color, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 18, elevation: 12 }}>
        <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
          <Ionicons name="medkit" size={42} color={color} />
        </View>
      </View>
    </Animated.View>
  );
}
