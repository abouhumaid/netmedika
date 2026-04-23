import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Snackbar } from '@/components/snackbar';
import Header from '@/components/header';
import { getAccessToken } from '@/lib/auth-session';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAL = '#0F766E';

const MEDICINE_TYPES = [
  { label: 'Capsule',   color: '#0F766E' },
  { label: 'Tablet',    color: '#4F46E5' },
  { label: 'Syrup',     color: '#D97706' },
  { label: 'Injection', color: '#E11D48' },
  { label: 'Drops',     color: '#0EA5E9' },
  { label: 'Inhaler',   color: '#7C3AED' },
  { label: 'Cream',     color: '#059669' },
  { label: 'Patch',     color: '#B45309' },
] as const;

const FREQUENCIES = [
  { label: 'Once daily',        sub: '1× per day',          icon: 'sunny-outline'       as const },
  { label: 'Twice daily',       sub: '2× per day',          icon: 'sync-outline'        as const },
  { label: 'Three times daily', sub: '3× per day',          icon: 'refresh-outline'     as const },
  { label: 'Every 8 hours',     sub: '3× per day (fixed)',  icon: 'time-outline'        as const },
  { label: 'Every 12 hours',    sub: '2× per day (fixed)',  icon: 'timer-outline'       as const },
  { label: 'Weekly',            sub: '1× per week',         icon: 'calendar-outline'    as const },
  { label: 'As needed',         sub: 'PRN / when required', icon: 'help-circle-outline' as const },
] as const;

const STRENGTH_HINTS = ['250mg', '500mg', '1000mg', '5ml', '10ml'] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type MedType   = typeof MEDICINE_TYPES[number];
type FreqType  = typeof FREQUENCIES[number];
type DropdownOption = (MedType | FreqType) & { icon?: IconName };

// ─── RevealRow ────────────────────────────────────────────────────────────────

function RevealRow({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  const anim = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [visible]);

  return (
    <Animated.View
      style={{
        maxHeight:  anim.interpolate({ inputRange: [0, 1], outputRange: [0, 400] }),
        opacity:    anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
        overflow:   'hidden',
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}
    >
      <View className="pt-4">{children}</View>
    </Animated.View>
  );
}

// ─── StepBadge ────────────────────────────────────────────────────────────────

function StepBadge({ step, active, done }: { step: number; active: boolean; done: boolean }) {
  return (
    <View
      className={`h-6 w-6 items-center justify-center rounded-full
        ${done ? 'bg-teal-600' : active ? 'border-2 border-teal-500 bg-teal-50' : 'bg-slate-100'}`}
    >
      {done
        ? <Ionicons name="checkmark" size={13} color="#fff" />
        : <Text className={`text-[11px] font-black ${active ? 'text-teal-700' : 'text-slate-400'}`}>{step}</Text>
      }
    </View>
  );
}

// ─── SectionCard ─────────────────────────────────────────────────────────────

function SectionCard({
  step, active, done, title, subtitle, children,
}: {
  step: number; active: boolean; done: boolean;
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <View className="rounded-[18px] bg-white px-4 py-5 shadow-sm border border-slate-100">
      <View className="flex-row items-center gap-2 mb-4">
        <StepBadge step={step} active={active} done={done} />
        <View>
          <Text className="text-[15px] font-black text-[#0F172A]">{title}</Text>
          {subtitle && <Text className="text-[11px] text-slate-400">{subtitle}</Text>}
        </View>
      </View>
      {children}
    </View>
  );
}

// ─── useSheetAnim ─────────────────────────────────────────────────────────────
// Shared slide-up + backdrop animation for both modals.

function useSheetAnim(visible: boolean) {
  const slideAnim    = useRef(new Animated.Value(600)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: visible ? 0 : 600,
        speed: 16, bounciness: visible ? 5 : 0,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: visible ? 1 : 0,
        duration: visible ? 260 : 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  return { slideAnim, backdropAnim };
}

// ─── BottomSheet ──────────────────────────────────────────────────────────────
// Reusable animated bottom sheet wrapper used by both modals.

function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { slideAnim, backdropAnim } = useSheetAnim(visible);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* Backdrop */}
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', opacity: backdropAnim }}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={{ flex: 1 }} />
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={{
          transform: [{ translateY: slideAnim }],
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: '#fff',
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          overflow: 'hidden', maxHeight: '92%',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.12, shadowRadius: 24, elevation: 24,
        }}
      >
        {/* Handle */}
        <View className="items-center pt-3 pb-1">
          <View className="h-1 w-10 rounded-full bg-slate-200" />
        </View>

        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pb-3 pt-2">
          <View>
            <Text className="text-[20px] font-black text-[#0F172A]">{title}</Text>
            {subtitle && <Text className="text-[12px] text-slate-400">{subtitle}</Text>}
          </View>
          <Pressable
            onPress={onClose}
            className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200"
          >
            <Ionicons name="close" size={18} color="#475569" />
          </Pressable>
        </View>

        {/* Teal accent bar */}
        <View style={{ height: 3, backgroundColor: TEAL, marginHorizontal: 20, borderRadius: 2, marginBottom: 16 }} />

        {children}
      </Animated.View>
    </Modal>
  );
}

// ─── PrimaryButton ────────────────────────────────────────────────────────────

function PrimaryButton({
  label, disabledLabel, icon, onPress, enabled, scaleAnim,
}: {
  label: string; disabledLabel?: string; icon: IconName;
  onPress: () => void; enabled: boolean; scaleAnim?: Animated.Value;
}) {
  const btn = (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      style={{
        backgroundColor: enabled ? TEAL : '#E2E8F0',
        shadowColor: TEAL,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: enabled ? 0.35 : 0,
        shadowRadius: 16,
        elevation: enabled ? 8 : 0,
      }}
      className="flex-row items-center justify-center gap-2.5 rounded-[16px] py-4"
    >
      <Ionicons name={icon} size={20} color={enabled ? '#fff' : '#94A3B8'} />
      <Text className={`text-[15px] font-black tracking-wide ${enabled ? 'text-white' : 'text-slate-400'}`}>
        {enabled ? label : (disabledLabel ?? label)}
      </Text>
    </Pressable>
  );

  return scaleAnim
    ? <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>{btn}</Animated.View>
    : btn;
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────

function Dropdown({
  placeholder, value, options, onSelect, disabled,
}: {
  placeholder: string; value: string;
  options: readonly DropdownOption[];
  onSelect: (label: string) => void; disabled?: boolean;
}) {
  const [open, setOpen]  = useState(false);
  const rotateAnim       = useRef(new Animated.Value(0)).current;
  const fadeAnim         = useRef(new Animated.Value(0)).current;
  const scaleAnim        = useRef(new Animated.Value(0.95)).current;

  function animateOpen(opening: boolean) {
    Animated.parallel([
      Animated.timing(rotateAnim, { toValue: opening ? 1 : 0, duration: opening ? 200 : 160, useNativeDriver: true }),
      Animated.timing(fadeAnim,   { toValue: opening ? 1 : 0, duration: opening ? 180 : 140, useNativeDriver: true }),
      Animated.spring(scaleAnim,  { toValue: opening ? 1 : 0.95, speed: 20, bounciness: 4,   useNativeDriver: true }),
    ]).start(() => { if (!opening) setOpen(false); });
  }

  function openDropdown()            { if (!disabled) { setOpen(true); animateOpen(true); } }
  function closeDropdown()           { animateOpen(false); }
  function select(label: string)     { onSelect(label); closeDropdown(); }

  const chevronRotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const selected      = options.find((o) => o.label === value);

  return (
    <View>
      {/* Trigger */}
      <Pressable
        onPress={openDropdown}
        style={{ opacity: disabled ? 0.45 : 1 }}
        className={`flex-row items-center justify-between rounded-[14px] border-2 px-4 py-3.5
          ${value ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-white'}`}
      >
        <View className="flex-row items-center gap-2.5 flex-1">
          {selected ? (
            /* Colored dot instead of icon */
            <>
              <View
                style={{ backgroundColor: '#CBD5E1' }}
                className="h-2.5 w-2.5 rounded-full"
              />
              <Text className="text-[14px] font-bold text-[#0F172A]">{value}</Text>
            </>
          ) : (
            <Text className="text-[14px] text-slate-400">{placeholder}</Text>
          )}
        </View>
        <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
          <Ionicons name="chevron-down" size={18} color={value ? TEAL : '#94A3B8'} />
        </Animated.View>
      </Pressable>

      {/* Floating modal sheet */}
      {open && (
        <Modal transparent animationType="fade" onRequestClose={closeDropdown}>
          <TouchableWithoutFeedback onPress={closeDropdown}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' }} />
          </TouchableWithoutFeedback>

          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              position: 'absolute', left: 16, right: 16, top: '25%',
              borderRadius: 20, backgroundColor: '#fff', overflow: 'hidden',
              shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.2, shadowRadius: 24, elevation: 24,
            }}
          >
            {/* Sheet header */}
            <View className="flex-row items-center justify-between border-b border-slate-100 px-4 py-3.5">
              <Text className="text-[13px] font-black uppercase tracking-[1.6px] text-slate-400">
                {placeholder}
              </Text>
              <Pressable onPress={closeDropdown} className="h-7 w-7 items-center justify-center rounded-full bg-slate-100">
                <Ionicons name="close" size={14} color="#475569" />
              </Pressable>
            </View>

            <ScrollView bounces={false} style={{ maxHeight: 340 }}>
              {options.map((opt, idx) => {
                const isSelected = opt.label === value;
                return (
                  <Pressable
                    key={opt.label}
                    onPress={() => select(opt.label)}
                    style={{ backgroundColor: isSelected ? '#F0FDF4' : undefined }}
                    className={`flex-row items-center gap-3 px-4 py-3.5 active:bg-slate-50
                      ${idx < options.length - 1 ? 'border-b border-slate-50' : ''}`}
                  >
                    {/* Colored dot */}
                    <View
                      style={{ backgroundColor: '#CBD5E1' }}
                      className="h-3 w-3 rounded-full"
                    />

                    <View className="flex-1">
                      <Text className={`text-[14px] font-bold ${isSelected ? 'text-teal-700' : 'text-[#0F172A]'}`}>
                        {opt.label}
                      </Text>
                      {'sub' in opt && opt.sub
                        ? <Text className="text-[11px] text-slate-400">{opt.sub}</Text>
                        : null}
                    </View>

                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={TEAL} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        </Modal>
      )}
    </View>
  );
}

// ─── AddressModal ─────────────────────────────────────────────────────────────
// Single textarea for delivery address — used by both order form and prescription upload.

function AddressModal({
  visible, onClose, onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (address: string) => void;
}) {
  const [address, setAddress] = useState('');
  const filled = address.trim().length >= 10;

  // Reset on close
  useEffect(() => { if (!visible) setAddress(''); }, [visible]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Delivery Address"
      subtitle="Where should we deliver your order?"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}
      >
        {/* Label */}
        <Text className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          Full Delivery Address
        </Text>

        {/* Single textarea */}
        <View
          className={`rounded-[16px] border-2 px-4 py-4 mb-3
            ${filled ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-white'}`}
        >
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder={
              'Enter your full delivery address...\n\ne.g. 12 Ahmadu Bello Way,\nKano Municipal, Kano State.\nNear Emir\'s Palace.'
            }
            placeholderTextColor="#CBD5E1"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
            className="min-h-[130px] text-[14px] font-semibold leading-6 text-[#0F172A]"
          />
        </View>

        {/* Character hint */}
        <Text className="mb-5 text-[11px] text-slate-400">
          Include street, city, state and any landmark for faster delivery.
        </Text>

        {/* Live preview */}
        {filled && (
          <View className="mb-5 rounded-[14px] border border-teal-200 bg-teal-50 px-4 py-3.5">
            <View className="flex-row items-center gap-2 mb-1.5">
              <Ionicons name="location" size={14} color={TEAL} />
              <Text className="text-[12px] font-black text-teal-800">Delivery Preview</Text>
            </View>
            <Text className="text-[12px] leading-[18px] text-teal-700">{address.trim()}</Text>
          </View>
        )}

        <PrimaryButton
          label="Confirm Address"
          disabledLabel="Enter a full address to continue"
          icon="checkmark-done-outline"
          enabled={filled}
          onPress={() => { if (filled) onConfirm(address.trim()); }}
        />
      </ScrollView>
    </BottomSheet>
  );
}

// ─── OrderScreen ──────────────────────────────────────────────────────────────

export default function OrderScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const [medType,   setMedType]   = useState('');
  const [medName,   setMedName]   = useState('');
  const [strength,  setStrength]  = useState('');
  const [frequency, setFrequency] = useState('');

  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading,   setUploading]   = useState(false);
  const [prescriptionAddress, setPrescriptionAddress] = useState('');

  // Two entry points for the same address modal
  const [addressModal, setAddressModal] = useState<'order' | 'prescription' | null>(null);

  const [snackMsg,  setSnackMsg]  = useState('');
  const [snackTone, setSnackTone] = useState<'success' | 'error'>('success');

  const showStrength  = medName.trim().length > 0;
  const showFrequency = showStrength && strength.trim().length > 0;

  const steps     = [!!medType, !!medName.trim(), !!strength.trim(), !!frequency] as const;
  const progress  = steps.filter(Boolean).length;
  const allFilled = steps.every(Boolean);

  const btnScale   = useRef(new Animated.Value(1)).current;
  const prevFilled = useRef(false);

  useEffect(() => {
    if (allFilled && !prevFilled.current) {
      Animated.sequence([
        Animated.spring(btnScale, { toValue: 1.04, speed: 30, bounciness: 6, useNativeDriver: true }),
        Animated.spring(btnScale, { toValue: 1,    speed: 20, bounciness: 4, useNativeDriver: true }),
      ]).start();
    }
    prevFilled.current = allFilled;
  }, [allFilled]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      ImagePicker.requestMediaLibraryPermissionsAsync().then(({ status }) => {
        if (status !== 'granted') {
          setSnackTone('error');
          setSnackMsg('Photo library permission is required.');
        }
      });
    }
  }, []);

  async function pickImageNative() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFilePreview(result.assets[0].uri);
        setSnackTone('success');
        setSnackMsg('✓ Image selected successfully');
      }
    } catch {
      setSnackTone('error');
      setSnackMsg('Unable to pick image.');
    }
  }

  function onPickFile(e: any) {
    const file = e?.target?.files?.[0];
    if (file) setFilePreview(URL.createObjectURL(file));
  }

  async function uploadPrescription() {
    if (!filePreview) return;
    setUploading(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');

      // Import the createOrder function from auth-api
      const { createOrder } = await import('@/lib/auth-api');

      // For prescription uploads, delivery address is optional
      // The upload will be reviewed by pharmacist before dispatch
      const order = await createOrder(
        token,
        {
          quantity: 1,
          delivery_address: prescriptionAddress?.trim() || undefined,
        },
        {
          uri: filePreview,
          name: filePreview.split('/').pop() || 'prescription.jpg',
        }
      );

      setSnackTone('success');
      setSnackMsg(`✓ Prescription uploaded! Order ID: ${order.order_id}`);
      setFilePreview(null);
      setPrescriptionAddress('');
    } catch (err: any) {
      setSnackTone('error');
      setSnackMsg(err?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  // Single handler for both order form and prescription address confirm
  async function handleAddressConfirm(address: string) {
    setAddressModal(null);
    
    // Handle prescription upload address (just save to state)
    if (addressModal === 'prescription') {
      setPrescriptionAddress(address);
      setSnackTone('success');
      setSnackMsg(`✓ Delivery address set: ${address}`);
      return;
    }

    // Handle medicine order - actually create the order
    if (addressModal === 'order') {
      setUploading(true);
      try {
        const token = await getAccessToken();
        if (!token) throw new Error('Not authenticated');

        // Import the createOrder function from auth-api
        const { createOrder } = await import('@/lib/auth-api');

        // Create the order with all medicine details and delivery address
        const order = await createOrder(
          token,
          {
            medicine_name: medName?.trim(),
            dosage_form: medType?.trim(),
            strength: strength?.trim(),
            frequency: frequency?.trim(),
            quantity: 1,
            delivery_address: address?.trim(),
          }
        );

        setSnackTone('success');
        setSnackMsg(`✓ Order placed! Order ID: ${order.order_id}`);
        
        // Reset the form for next order
        setMedType('');
        setMedName('');
        setStrength('');
        setFrequency('');
      } catch (err: any) {
        setSnackTone('error');
        setSnackMsg(err?.message ?? 'Failed to create order');
      } finally {
        setUploading(false);
      }
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F0FDF9]">
      <StatusBar style="dark" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <Header title="Place Order" subtitle="Fill in your prescription details" showBack />

        <View className="px-4 pt-4">

          {/* ── Progress tracker ── */}
          <View className="mb-5 rounded-[16px] bg-white px-4 py-4 shadow-sm border border-slate-100">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[13px] font-black text-slate-600">Order Progress</Text>
              <View className="flex-row items-center gap-1">
                <Text className="text-[13px] font-black text-teal-700">{progress}</Text>
                <Text className="text-[13px] text-slate-400"> / 4 steps</Text>
              </View>
            </View>
            <View className="flex-row gap-1.5 mb-3">
              {steps.map((done, i) => (
                <View key={i} className={`h-2 flex-1 rounded-full ${done ? 'bg-teal-600' : 'bg-slate-100'}`} />
              ))}
            </View>
            <View className="flex-row justify-between">
              {(['Type', 'Name', 'Strength', 'Frequency'] as const).map((label, i) => (
                <View key={label} className="items-center gap-1">
                  <StepBadge step={i + 1} active={progress === i} done={steps[i]} />
                  <Text className={`text-[9px] font-bold ${steps[i] ? 'text-teal-600' : 'text-slate-400'}`}>
                    {label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Step 1+2: Type & Name ── */}
          <SectionCard step={1} active={!medType} done={!!medType} title="Medicine Details">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Type
                </Text>
                <Dropdown
                  placeholder="Select type"
                  value={medType}
                  options={MEDICINE_TYPES}
                  onSelect={setMedType}
                />
              </View>

              <View className="flex-1">
                <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Name
                </Text>
                <View
                  className={`flex-row items-center rounded-[14px] border-2 px-3 py-3.5
                    ${medName.trim() ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-white'}`}
                >
                  <Ionicons
                    name="search-outline" size={15}
                    color={medName.trim() ? TEAL : '#CBD5E1'}
                    style={{ marginRight: 6 }}
                  />
                  <TextInput
                    value={medName}
                    onChangeText={(t) => {
                      setMedName(t);
                      if (!t.trim()) { setStrength(''); setFrequency(''); }
                    }}
                    placeholder="e.g. Amoxicillin"
                    placeholderTextColor="#CBD5E1"
                    returnKeyType="next"
                    className="flex-1 text-[13px] font-semibold text-[#0F172A]"
                  />
                  {medName.trim().length > 0 && <Ionicons name="checkmark-circle" size={15} color={TEAL} />}
                </View>
              </View>
            </View>
          </SectionCard>

          {/* ── Step 3: Strength ── */}
          <RevealRow visible={showStrength}>
            <SectionCard
              step={3} active={showStrength && !strength.trim()} done={!!strength.trim()}
              title="Medicine Strength" subtitle="e.g. 500mg · 5ml · 10mcg"
            >
              <View
                className={`flex-row items-center gap-3 rounded-[14px] border-2 px-4 py-3.5
                  ${strength.trim() ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-white'}`}
              >
                <View className="h-8 w-8 items-center justify-center rounded-full bg-teal-50">
                  <Ionicons name="barbell-outline" size={16} color={TEAL} />
                </View>
                <TextInput
                  value={strength}
                  onChangeText={(t) => { setStrength(t); if (!t.trim()) setFrequency(''); }}
                  placeholder="Enter strength (e.g. 500mg)"
                  placeholderTextColor="#CBD5E1"
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  className="flex-1 text-[14px] font-semibold text-[#0F172A]"
                />
                {strength.trim().length > 0 && <Ionicons name="checkmark-circle" size={18} color={TEAL} />}
              </View>

              <View className="mt-3 flex-row flex-wrap gap-2">
                {STRENGTH_HINTS.map((hint) => (
                  <Pressable
                    key={hint}
                    onPress={() => setStrength(hint)}
                    className={`rounded-full border px-3 py-1 active:opacity-70
                      ${strength === hint ? 'border-teal-500 bg-teal-600' : 'border-slate-200 bg-slate-50'}`}
                  >
                    <Text className={`text-[12px] font-bold ${strength === hint ? 'text-white' : 'text-slate-500'}`}>
                      {hint}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </SectionCard>
          </RevealRow>

          {/* ── Step 4: Frequency ── */}
          <RevealRow visible={showFrequency}>
            <SectionCard
              step={4} active={showFrequency && !frequency} done={!!frequency}
              title="Dosage Frequency" subtitle="How often should it be taken?"
            >
              <Dropdown
                placeholder="Select frequency"
                value={frequency}
                options={FREQUENCIES}
                onSelect={setFrequency}
              />
            </SectionCard>
          </RevealRow>

          {/* ── Order summary ── */}
          <RevealRow visible={allFilled}>
            <View className="rounded-[16px] border border-teal-200 bg-teal-50 px-4 py-3.5">
              <View className="flex-row items-center gap-2 mb-2">
                <Ionicons name="checkmark-circle" size={17} color={TEAL} />
                <Text className="text-[13px] font-black text-teal-800">Order Summary</Text>
              </View>
              <View className="flex-row flex-wrap gap-x-5 gap-y-1.5">
                {([
                  ['Type', medType], ['Medicine', medName],
                  ['Strength', strength], ['Frequency', frequency],
                ] as const).map(([label, val]) => (
                  <View key={label} className="flex-row items-center gap-1.5">
                    <Text className="text-[11px] font-bold text-teal-500">{label}:</Text>
                    <Text className="text-[11px] font-black text-teal-900">{val}</Text>
                  </View>
                ))}
              </View>
            </View>
          </RevealRow>

          {/* ── Place Order button ── */}
          <View className="mt-4">
            <PrimaryButton
              label="Continue to Delivery →"
              disabledLabel="Complete all steps to order"
              icon="bag-check-outline"
              enabled={allFilled}
              onPress={() => setAddressModal('order')}
              scaleAnim={btnScale}
            />
          </View>

          {/* ── Divider ── */}
          <View className="my-7 flex-row items-center gap-3">
            <View className="flex-1 h-px bg-slate-200" />
            <View className="flex-row items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
              <Ionicons name="document-attach-outline" size={13} color="#94A3B8" />
              <Text className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Prescription
              </Text>
            </View>
            <View className="flex-1 h-px bg-slate-200" />
          </View>

          {/* ── Upload prescription ── */}
          <View className="rounded-[18px] bg-white px-4 py-5 shadow-sm border border-slate-100">
            <View className="flex-row items-center justify-between mb-1">
              <View className="flex-row items-center gap-2">
                <View className="h-8 w-8 items-center justify-center rounded-full bg-indigo-50">
                  <Ionicons name="document-text-outline" size={17} color="#4F46E5" />
                </View>
                <Text className="text-[15px] font-black text-[#0F172A]">Upload Prescription</Text>
              </View>
              <View className="rounded-full bg-amber-100 px-2.5 py-1">
                <Text className="text-[10px] font-black text-amber-700">OPTIONAL</Text>
              </View>
            </View>
            <Text className="mb-4 ml-10 text-[12px] leading-[17px] text-slate-400">
              A clear photo helps our pharmacist verify your order faster.
            </Text>

            {/* Image preview */}
            {filePreview ? (
              <View className="mb-4">
                <Image
                  source={{ uri: filePreview }}
                  style={{ height: 200, width: '100%', borderRadius: 14 }}
                  resizeMode="cover"
                />
                <Pressable
                  onPress={() => setFilePreview(null)}
                  className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-black/50"
                >
                  <Ionicons name="close" size={16} color="#fff" />
                </Pressable>
                <View className="mt-2 flex-row items-center gap-1.5">
                  <Ionicons name="checkmark-circle" size={14} color={TEAL} />
                  <Text className="text-[12px] font-bold text-teal-600">Image selected</Text>
                </View>
              </View>
            ) : Platform.OS === 'web' ? (
              <label
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 8, padding: '20px 16px', marginBottom: 16,
                  borderRadius: 14, border: '2px dashed #CBD5E1',
                  cursor: 'pointer', background: '#F8FAFC',
                }}
              >
                <span style={{ fontSize: 28 }}>📎</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Click to browse file</span>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>JPG, PNG up to 10MB</span>
                <input type="file" accept="image/*" onChange={onPickFile} style={{ display: 'none' }} />
              </label>
            ) : (
              <Pressable
                onPress={pickImageNative}
                className="mb-4 items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-slate-200 bg-slate-50 py-6 active:bg-slate-100"
              >
                <View className="h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
                  <Ionicons name="cloud-upload-outline" size={24} color="#4F46E5" />
                </View>
                <Text className="text-[14px] font-bold text-slate-600">Tap to upload prescription</Text>
                <Text className="text-[11px] text-slate-400">JPG, PNG up to 10MB</Text>
              </Pressable>
            )}

            {/* Upload + place prescription order buttons */}
            <View className="gap-3">
              {filePreview && (
                <PrimaryButton
                  label="Upload Prescription"
                  disabledLabel="Uploading..."
                  icon={uploading ? 'time-outline' : 'cloud-upload-outline'}
                  enabled={!uploading}
                  onPress={uploadPrescription}
                />
              )}

              {/* Prescription delivery address — only visible if picture is uploaded */}
              {filePreview && (
                <PrimaryButton
                  label="Add Delivery Address"
                  icon="location-outline"
                  enabled
                  onPress={() => setAddressModal('prescription')}
                />
              )}
            </View>

            {/* Privacy note */}
            <View className="mt-4 flex-row items-start gap-2 rounded-[10px] bg-slate-50 px-3 py-2.5">
              <Ionicons name="lock-closed-outline" size={13} color="#64748B" style={{ marginTop: 1 }} />
              <Text className="flex-1 text-[11px] leading-[16px] text-slate-400">
                Your prescription is encrypted and only accessible by our licensed pharmacists.
                It will never be shared with third parties.
              </Text>
            </View>
          </View>

        </View>
      </ScrollView>

      {/* ── Single shared address modal ── */}
      <AddressModal
        visible={addressModal !== null}
        onClose={() => setAddressModal(null)}
        onConfirm={handleAddressConfirm}
      />

      {/* ── Loading spinner modal ── */}
      <Modal
        visible={uploading}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View className="items-center rounded-[20px] bg-white px-8 py-10 shadow-lg">
            <ActivityIndicator size="large" color={TEAL} />
            <Text className="mt-4 text-[16px] font-black text-slate-900">
              {addressModal === 'prescription' ? 'Uploading Prescription...' : 'Creating Order...'}
            </Text>
            <Text className="mt-1 text-center text-[12px] text-slate-500">
              Please wait while we process your {addressModal === 'prescription' ? 'prescription' : 'order'}
            </Text>
          </View>
        </View>
      </Modal>

      <Snackbar
        visible={!!snackMsg}
        message={snackMsg}
        tone={snackTone}
        bottomOffset={tabBarHeight}
        onHide={() => setSnackMsg('')}
      />
    </SafeAreaView>
  );
}
