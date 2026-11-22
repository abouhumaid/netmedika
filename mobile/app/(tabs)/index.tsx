import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { Snackbar } from '@/components/snackbar';
import { fetchOrders, fetchProfile, type Order, type UserProfile } from '@/lib/auth-api';
import { clearAuthSession, getAccessToken } from '@/lib/auth-session';
import { setPendingFlashToast } from '@/lib/flash-toast';
import { useCustomTabBarHeight } from '@/hooks/use-custom-tab-bar-height';

const COLORS = {
  background: '#F5F7F6',
  ink: '#172321',
  muted: '#71807D',
  line: '#E7ECEA',
  teal: '#0F766E',
  paleTeal: '#E8F5F2',
  white: '#FFFFFF',
};

const QUICK_ACTIONS = [
  { label: 'New order', icon: 'add-circle-outline' as const, route: '/orders', tint: '#E7F5F2', color: '#0F766E' },
  { label: 'Track order', icon: 'cube-outline' as const, route: '/cart', tint: '#EEF1FF', color: '#4F46E5' },
  { label: 'My profile', icon: 'person-outline' as const, route: '/profile', tint: '#FFF1E8', color: '#C65D24' },
];

const PAID_STATUSES = new Set(['paid', 'delivered', 'completed']);
const ACTIVE_STATUSES = new Set(['pending', 'verified', 'processing']);

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatAmount(value: number | null) {
  if (value === null || !Number.isFinite(value) || value <= 0) return 'Amount pending';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getStatusColors(status: Order['status']) {
  if (['paid', 'completed', 'delivered'].includes(status)) {
    return { background: '#E7F5F2', foreground: '#0F766E' };
  }
  if (['verified', 'processing'].includes(status)) {
    return { background: '#EEF1FF', foreground: '#4338CA' };
  }
  if (['rejected', 'cancelled'].includes(status)) {
    return { background: '#FFF0F0', foreground: '#B42318' };
  }
  return { background: '#FFF6E5', foreground: '#A15C00' };
}

function SectionHeading({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8} style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>{action}</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.teal} />
        </Pressable>
      ) : null}
    </View>
  );
}

function RecentOrderRow({ order, last }: { order: Order; last: boolean }) {
  const badge = getStatusColors(order.status);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/cart')}
      style={[styles.orderRow, !last && styles.orderRowBorder]}
    >
      <View style={styles.orderIcon}>
        <Ionicons name="medkit-outline" size={19} color={COLORS.teal} />
      </View>
      <View style={styles.orderCopy}>
        <Text numberOfLines={1} style={styles.orderName}>
          {order.medication_name || 'Prescription order'}
        </Text>
        <Text numberOfLines={1} style={styles.orderMeta}>
          #{order.order_id} · {formatDate(order.created_at)}
        </Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: badge.background }]}>
        <Text style={[styles.statusText, { color: badge.foreground }]}>{order.status}</Text>
      </View>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const tabBarHeight = useCustomTabBarHeight();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [ordersUnavailable, setOrdersUnavailable] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarTone, setSnackbarTone] = useState<'success' | 'error'>('success');
  const introAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          setPendingFlashToast({ message: 'No saved session. Please sign in.', tone: 'error' });
          router.replace('/login');
          return;
        }

        const [profileResult, ordersResult] = await Promise.allSettled([
          fetchProfile(accessToken),
          fetchOrders(accessToken, 0, 20),
        ]);

        if (profileResult.status === 'rejected') throw profileResult.reason;
        if (isMounted) setProfile(profileResult.value);

        if (ordersResult.status === 'fulfilled') {
          if (isMounted) {
            setOrders(ordersResult.value.orders);
            setTotalOrders(ordersResult.value.total_orders);
          }
        } else if (isMounted) {
          setOrdersUnavailable(true);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to load your dashboard.';
        const isAuthError = /401|403|unauthoriz|invalid token|expired/i.test(message);
        if (isAuthError) {
          await clearAuthSession();
          setPendingFlashToast({ message: message || 'Session expired.', tone: 'error' });
          if (isMounted) router.replace('/login');
        } else if (isMounted) {
          setSnackbarTone('error');
          setSnackbarMessage(message);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadDashboard();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const refreshOrders = async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const result = await fetchOrders(token, 0, 20);
        if (active) { setOrders(result.orders); setTotalOrders(result.total_orders); setOrdersUnavailable(false); }
      } catch { if (active) setOrdersUnavailable(true); }
    };
    const timer = setInterval(refreshOrders, 15000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  useEffect(() => {
    Animated.timing(introAnim, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [introAnim]);

  const firstName = profile?.username?.trim().split(/\s+/)[0] || 'there';
  const recentOrders = useMemo(() => orders.slice(0, 3), [orders]);
  const recentTransaction = useMemo(() => orders.find((order) => PAID_STATUSES.has(order.status)), [orders]);
  const activeOrderCount = useMemo(
    () => orders.filter((order) => ACTIVE_STATUSES.has(order.status)).length,
    [orders],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar style="dark" />
        <View style={styles.loadingIcon}><ActivityIndicator size="small" color={COLORS.teal} /></View>
        <Text style={styles.loadingTitle}>Preparing your dashboard</Text>
        <Text style={styles.loadingCopy}>Loading your account and recent activity</Text>
      </SafeAreaView>
    );
  }

  const initial = firstName.charAt(0).toUpperCase();
  const introTranslate = introAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 24 }]}
      >
        <View style={styles.topBar}>
          <View style={styles.brandMark}><Ionicons name="medical" size={21} color="#FFFFFF" /></View>
          <View style={styles.brandCopy}>
            <Text style={styles.brandName}>Netmedika</Text>
            <Text style={styles.brandTagline}>YOUR HEALTH, SIMPLIFIED</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={activeOrderCount ? `${activeOrderCount} active order updates` : 'View order activity'}
            onPress={() => router.push('/notifications')}
            style={styles.iconButton}
          >
            <Ionicons name="notifications-outline" size={21} color="#33413E" />
            {activeOrderCount > 0 ? (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationCount}>{activeOrderCount > 9 ? '9+' : activeOrderCount}</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            onPress={() => router.push('/profile')}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{initial}</Text>
          </Pressable>
        </View>

        <Animated.View style={{ opacity: introAnim, transform: [{ translateY: introTranslate }] }}>
          <LinearGradient
            colors={['#0F766E', '#115E59']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.welcomeCard}
          >
            <View style={styles.heroOrbOne} />
            <View style={styles.heroOrbTwo} />
            <Text style={styles.heroEyebrow}>{getGreeting().toUpperCase()} · YOUR HEALTH HUB</Text>
            <Text style={styles.heroTitle}>Hello, {firstName}</Text>
            <Text style={styles.heroCopy}>Manage medicine orders and keep your care moving.</Text>
            <Pressable onPress={() => router.push('/cart')} style={styles.heroButton}>
              <Text style={styles.heroButtonText}>Track your orders</Text>
              <Ionicons name="arrow-forward" size={15} color={COLORS.teal} />
            </Pressable>
          </LinearGradient>
        </Animated.View>

        <View style={styles.summaryRow}>
          <Pressable onPress={() => router.push('/cart')} style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: '#E7F5F2' }]}>
              <Ionicons name="cube-outline" size={18} color={COLORS.teal} />
            </View>
            <View>
              <Text style={styles.summaryValue}>{activeOrderCount}</Text>
              <Text style={styles.summaryLabel}>Active orders</Text>
            </View>
          </Pressable>
          <Pressable onPress={() => router.push('/cart')} style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: '#EEF1FF' }]}>
              <Ionicons name="receipt-outline" size={18} color="#4F46E5" />
            </View>
            <View>
              <Text style={styles.summaryValue}>{totalOrders}</Text>
              <Text style={styles.summaryLabel}>Recent orders</Text>
            </View>
          </Pressable>
        </View>

        <SectionHeading title="Quick actions" />
        <View style={styles.actionsRow}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              onPress={() => router.push(action.route as any)}
              style={styles.actionCard}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.tint }]}>
                <Ionicons name={action.icon} size={21} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        <SectionHeading title="Recent transaction" action="All activity" onAction={() => router.push('/cart')} />
        {recentTransaction ? (
          <Pressable onPress={() => router.push('/cart')} style={styles.transactionCard}>
            <View style={styles.transactionIcon}><Ionicons name="card-outline" size={21} color={COLORS.teal} /></View>
            <View style={styles.transactionCopy}>
              <Text style={styles.transactionTitle}>Order payment</Text>
              <Text style={styles.transactionMeta}>#{recentTransaction.order_id} · {formatDate(recentTransaction.created_at)}</Text>
              <View style={styles.confirmedTag}><Text style={styles.confirmedText}>CONFIRMED</Text></View>
            </View>
            <Text style={styles.transactionAmount}>{formatAmount(recentTransaction.total_amount)}</Text>
          </Pressable>
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}><Ionicons name="receipt-outline" size={19} color="#73817E" /></View>
            <View style={styles.emptyCopy}>
              <Text style={styles.emptyTitle}>{ordersUnavailable ? 'Activity unavailable' : 'No confirmed transactions yet'}</Text>
              <Text style={styles.emptyDescription}>
                {ordersUnavailable ? 'Your activity will appear here when it is available.' : 'Confirmed order payments will appear here.'}
              </Text>
            </View>
          </View>
        )}

        <SectionHeading title="Recent orders" action="View all" onAction={() => router.push('/cart')} />
        {recentOrders.length > 0 ? (
          <View style={styles.ordersCard}>
            {recentOrders.map((order, index) => (
              <RecentOrderRow key={order.order_id} order={order} last={index === recentOrders.length - 1} />
            ))}
          </View>
        ) : (
          <View style={styles.noOrdersCard}>
            <View style={styles.noOrdersIcon}><Ionicons name="bag-handle-outline" size={21} color={COLORS.teal} /></View>
            <Text style={styles.emptyTitle}>Your orders will appear here</Text>
            <Text style={styles.noOrdersCopy}>Place an order to follow its progress from your dashboard.</Text>
            <Pressable onPress={() => router.push('/orders')} style={styles.startOrderButton}>
              <Text style={styles.startOrderText}>Start an order</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.disclaimer}>
          <Ionicons name="shield-checkmark-outline" size={16} color="#56716B" />
          <Text style={styles.disclaimerText}>
            For medical advice or emergencies, contact a licensed healthcare professional.
          </Text>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, paddingHorizontal: 24 },
  loadingIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: COLORS.paleTeal, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  loadingTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '700' },
  loadingCopy: { color: COLORS.muted, fontSize: 12, marginTop: 7 },
  topBar: { minHeight: 54, flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  brandMark: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.teal, marginRight: 11 },
  brandCopy: { flex: 1 },
  brandName: { color: COLORS.ink, fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  brandTagline: { color: COLORS.muted, fontSize: 8, fontWeight: '700', letterSpacing: 1.1, marginTop: 3 },
  iconButton: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  notificationBadge: { position: 'absolute', top: -4, right: -4, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: '#E24B5B', borderWidth: 2, borderColor: COLORS.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  notificationCount: { color: COLORS.white, fontSize: 8, lineHeight: 10, fontWeight: '800' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#DDEFEA', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.teal, fontSize: 14, fontWeight: '800' },
  welcomeCard: { minHeight: 204, borderRadius: 24, padding: 21, overflow: 'hidden', justifyContent: 'center' },
  heroOrbOne: { position: 'absolute', width: 170, height: 170, borderRadius: 85, top: -85, right: -45, backgroundColor: 'rgba(255,255,255,0.07)' },
  heroOrbTwo: { position: 'absolute', width: 112, height: 112, borderRadius: 56, bottom: -74, right: 60, backgroundColor: 'rgba(153,246,228,0.08)' },
  heroEyebrow: { color: '#B8E4DA', fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginBottom: 11 },
  heroTitle: { color: COLORS.white, fontSize: 27, lineHeight: 33, fontWeight: '800', letterSpacing: -0.6 },
  heroCopy: { color: '#D1E8E2', fontSize: 12, lineHeight: 18, marginTop: 6, maxWidth: 265 },
  heroButton: { height: 37, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 12, paddingHorizontal: 13, marginTop: 17 },
  heroButtonText: { color: COLORS.teal, fontSize: 11, fontWeight: '800', marginRight: 7 },
  summaryRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  summaryCard: { flex: 1, minHeight: 68, borderRadius: 17, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  summaryIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  summaryValue: { color: COLORS.ink, fontSize: 16, fontWeight: '800' },
  summaryLabel: { color: COLORS.muted, fontSize: 10, marginTop: 2 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 25, marginBottom: 11 },
  sectionTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '800', letterSpacing: -0.25 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  sectionActionText: { color: COLORS.teal, fontSize: 10, fontWeight: '700', marginRight: 2 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionCard: { flex: 1, minHeight: 94, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, borderRadius: 17, padding: 12, justifyContent: 'space-between' },
  actionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { color: '#34413E', fontSize: 10, fontWeight: '700', marginTop: 11 },
  transactionCard: { minHeight: 92, padding: 14, borderRadius: 18, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, flexDirection: 'row', alignItems: 'center' },
  transactionIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.paleTeal, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  transactionCopy: { flex: 1 },
  transactionTitle: { color: COLORS.ink, fontSize: 12, fontWeight: '800' },
  transactionMeta: { color: COLORS.muted, fontSize: 9, marginTop: 4 },
  confirmedTag: { alignSelf: 'flex-start', borderRadius: 5, backgroundColor: '#E7F5F2', paddingHorizontal: 6, paddingVertical: 3, marginTop: 6 },
  confirmedText: { color: COLORS.teal, fontSize: 7, fontWeight: '800', letterSpacing: 0.6 },
  transactionAmount: { color: COLORS.ink, fontSize: 12, fontWeight: '800', marginLeft: 7 },
  emptyCard: { minHeight: 75, borderRadius: 18, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, flexDirection: 'row', alignItems: 'center', padding: 14 },
  emptyIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: '#F1F4F3', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  emptyCopy: { flex: 1 },
  emptyTitle: { color: COLORS.ink, fontSize: 11, fontWeight: '800' },
  emptyDescription: { color: COLORS.muted, fontSize: 9, lineHeight: 14, marginTop: 4 },
  ordersCard: { borderRadius: 18, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 13 },
  orderRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center' },
  orderRowBorder: { borderBottomWidth: 1, borderBottomColor: '#EEF1F0' },
  orderIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F8F6', marginRight: 10 },
  orderCopy: { flex: 1, paddingRight: 6 },
  orderName: { color: COLORS.ink, fontSize: 11, fontWeight: '800' },
  orderMeta: { color: COLORS.muted, fontSize: 9, marginTop: 5 },
  statusBadge: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5 },
  statusText: { fontSize: 8, fontWeight: '800', textTransform: 'capitalize' },
  noOrdersCard: { minHeight: 175, borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', padding: 18 },
  noOrdersIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.paleTeal, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  noOrdersCopy: { color: COLORS.muted, fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 5 },
  startOrderButton: { borderRadius: 10, backgroundColor: COLORS.paleTeal, paddingHorizontal: 13, paddingVertical: 8, marginTop: 12 },
  startOrderText: { color: COLORS.teal, fontSize: 10, fontWeight: '800' },
  disclaimer: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 2, marginTop: 19 },
  disclaimerText: { flex: 1, color: '#6E7D79', fontSize: 9, lineHeight: 14, marginLeft: 8 },
});
