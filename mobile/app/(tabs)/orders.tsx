import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCustomTabBarHeight } from '@/hooks/use-custom-tab-bar-height';
import { Snackbar } from '@/components/snackbar';
import Header from '@/components/header';
import { fetchProfile, createOrder, type UserProfile } from '@/lib/auth-api';
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

// ─── Types ────────────────────────────────────────────────────────────────────

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type MedType   = typeof MEDICINE_TYPES[number];
type DropdownOption = MedType & { icon?: IconName; sub?: string };

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

// ─── SectionCard ─────────────────────────────────────────────────────────────

function SectionCard({
  title, subtitle, children,
}: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <View className="rounded-[18px] bg-white px-4 py-5 shadow-sm border border-slate-100">
      <View className="mb-4">
        <Text className="text-[15px] font-black text-[#0F172A]">{title}</Text>
        {subtitle && <Text className="mt-1 text-[11px] text-slate-400">{subtitle}</Text>}
      </View>
      {children}
    </View>
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
        className={`flex-row items-center justify-between rounded-[14px] border-2 px-3 py-3.5
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

// ─── OrderScreen ──────────────────────────────────────────────────────────────

export default function OrderScreen() {
  const tabBarHeight = useCustomTabBarHeight();
  const [orderMethod, setOrderMethod] = useState<'manual' | 'prescription'>('manual');
  const [medType,   setMedType]   = useState('');
  const [medName,   setMedName]   = useState('');
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState('prescription.jpg');
  const [fileMimeType, setFileMimeType] = useState<string | null>(null);
  const [uploading,   setUploading]   = useState(false);
  const [profileAddress, setProfileAddress] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  const [useProfileAddress, setUseProfileAddress] = useState(true);
  const [isProfileAddressLoading, setIsProfileAddressLoading] = useState(true);
  const [showAddress, setShowAddress] = useState(false);

  const [snackMsg,  setSnackMsg]  = useState('');
  const [snackTone, setSnackTone] = useState<'success' | 'error'>('success');

  const allFilled = !!medName.trim() && !!medType;
  const deliveryAddress = useProfileAddress ? profileAddress.trim() : customAddress.trim();
  const hasValidAddress = deliveryAddress.length >= 10;

  const btnScale   = useRef(new Animated.Value(1)).current;
  const prevFilled = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProfileAddress() {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const profile: UserProfile = await fetchProfile(token);
        const savedAddress = profile.address?.trim() ?? '';
        if (isMounted) {
          setProfileAddress(savedAddress);
          setUseProfileAddress(!!savedAddress);
        }
      } catch {
        if (isMounted) {
          setProfileAddress('');
          setUseProfileAddress(false);
        }
      } finally {
        if (isMounted) setIsProfileAddressLoading(false);
      }
    }

    loadProfileAddress();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (allFilled && !prevFilled.current) {
      Animated.sequence([
        Animated.spring(btnScale, { toValue: 1.04, speed: 30, bounciness: 6, useNativeDriver: true }),
        Animated.spring(btnScale, { toValue: 1,    speed: 20, bounciness: 4, useNativeDriver: true }),
      ]).start();
    }
    prevFilled.current = allFilled;
  }, [allFilled]);

  async function pickImageNative() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        setSnackTone('error');
        setSnackMsg('Allow photo access to choose a prescription.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, quality: 0.75,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFilePreview(result.assets[0].uri);
        setFileName(result.assets[0].fileName || `prescription.${result.assets[0].mimeType?.split('/')[1] || 'jpg'}`);
        setFileMimeType(result.assets[0].mimeType ?? null);
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
    if (file) {
      setFilePreview(URL.createObjectURL(file));
      setFileName(file.name || 'prescription.jpg');
      setFileMimeType(file.type || null);
    }
  }

  async function uploadPrescription() {
    if (!filePreview) return;
    if (!hasValidAddress) {
      setSnackTone('error');
      setSnackMsg('Enter a delivery address before placing the order.');
      return;
    }
    setUploading(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');

      const order = await createOrder(
        token,
        {
          quantity: 1,
          delivery_address: deliveryAddress,
        },
        {
          uri: filePreview,
          name: fileName,
          mimeType: fileMimeType,
        }
      );

      setSnackTone('success');
      setSnackMsg(`✓ Prescription uploaded! Order ID: ${order.order_id}`);
      setFilePreview(null);
      setFileName('prescription.jpg');
      setFileMimeType(null);
    } catch (err: any) {
      setSnackTone('error');
      setSnackMsg(err?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function placeManualOrder() {
    if (!allFilled || !hasValidAddress) return;
    setUploading(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');

      const order = await createOrder(token, {
        medicine_name: medName.trim(),
        dosage_form: medType.trim(),
        quantity: 1,
        delivery_address: deliveryAddress,
      });

      setSnackTone('success');
      setSnackMsg(`✓ Order placed! Order ID: ${order.order_id}`);
      setMedType('');
      setMedName('');
    } catch (err: any) {
      setSnackTone('error');
      setSnackMsg(err?.message ?? 'Failed to create order');
    } finally {
      setUploading(false);
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
        <Header title="New order" />

        <View className="px-4 pt-4">
          <View className="mb-4">
            <Text className="mb-1 text-[19px] font-black tracking-[-0.3px] text-[#0F172A]">How would you like to order?</Text>
            <Text className="text-[12px] leading-[18px] text-slate-500">Choose one method to get started.</Text>
          </View>

          <View className="mb-4 flex-row rounded-[15px] border border-slate-200 bg-slate-100 p-1">
            {([
              { key: 'manual', label: 'Enter medicine', icon: 'create-outline' as const },
              { key: 'prescription', label: 'Prescription', icon: 'document-text-outline' as const },
            ] as const).map((method) => {
              const selected = orderMethod === method.key;
              return (
                <Pressable
                  key={method.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  disabled={uploading}
                  onPress={() => setOrderMethod(method.key)}
                  className="min-h-[46px] flex-1 flex-row items-center justify-center rounded-[11px] px-2"
                  style={{ backgroundColor: selected ? '#FFFFFF' : 'transparent' }}
                >
                  <Ionicons name={method.icon} size={16} color={selected ? TEAL : '#64748B'} />
                  <Text className="ml-1.5 text-[11px] font-bold" style={{ color: selected ? TEAL : '#64748B' }}>
                    {method.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>


          {orderMethod === 'manual' ? (
          <>
          {/* ── Medicine order form ── */}
          <SectionCard
            title="Medicine Details"
            subtitle="Enter the medicine name and choose a type"
          >
            <View className="gap-4">
              <View>
                <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Medicine Name
                </Text>
                <View
                  className={`flex-row items-center rounded-[14px] border-2 px-3 py-3.5
                    ${medName.trim() ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-white'}`}
                >
                  
                  <TextInput
                    value={medName}
                    onChangeText={setMedName}
                    placeholder="e.g. Amoxicillin"
                    placeholderTextColor="#CBD5E1"
                    returnKeyType="next"
                    className="flex-1 text-[13px] font-semibold text-[#0F172A]"
                  />
                  {medName.trim().length > 0 && <Ionicons name="checkmark-circle" size={15} color={TEAL} />}
                </View>
              </View>

              <View>
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
            </View>
          </SectionCard>

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
              label="Order Now"
              disabledLabel={hasValidAddress ? 'Add medicine details' : 'Enter a delivery address'}
              icon="bag-check-outline"
              enabled={allFilled && hasValidAddress && !uploading}
              onPress={placeManualOrder}
              scaleAnim={btnScale}
            />
          </View>
          </>
          ) : (
          <>
          {/* ── Upload prescription ── */}
          <View className="rounded-[18px] bg-white px-4 py-5 shadow-sm border border-slate-100">
            <View className="flex-row items-center justify-between mb-1">
              <View className="flex-row items-center gap-2">
                <View className="h-8 w-8 items-center justify-center rounded-full bg-indigo-50">
                  <Ionicons name="document-text-outline" size={17} color="#4F46E5" />
                </View>
                <Text className="text-[15px] font-black text-[#0F172A]">Upload Prescription</Text>
              </View>
            </View>
            <Text className="mb-4 ml-10 text-[12px] leading-[17px] text-slate-400">
              Upload a clear image of your prescription for pharmacist review.
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
                  onPress={() => { setFilePreview(null); setFileName('prescription.jpg'); setFileMimeType(null); }}
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
                <span style={{ fontSize: 11, color: '#94A3B8' }}>JPG, PNG, GIF or WebP up to 5MB</span>
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
                <Text className="text-[11px] text-slate-400">JPG, PNG, GIF or WebP up to 5MB</Text>
              </Pressable>
            )}

            {/* Upload + place prescription order buttons */}
            <View className="gap-3">
              {filePreview && (
                <PrimaryButton
                  label="Upload Prescription"
                  disabledLabel={!hasValidAddress ? 'Enter a delivery address first' : 'Uploading...'}
                  icon={uploading ? 'time-outline' : 'cloud-upload-outline'}
                  enabled={hasValidAddress && !uploading}
                  onPress={uploadPrescription}
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
          </>
          )}

          <View className="mt-5 mb-4 rounded-[18px] border border-slate-100 bg-white px-4 py-4">
            <View className="flex-row items-center">
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-teal-50">
                <Ionicons name="location-outline" size={18} color={TEAL} />
              </View>
              <View className="flex-1 pr-2">
                <Text className="text-[13px] font-black text-[#0F172A]">Delivery address</Text>
                <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                  Use your saved profile address
                </Text>
              </View>
              <Switch
                accessibilityLabel="Show or hide delivery address"
                value={showAddress}
                onValueChange={setShowAddress}
                trackColor={{ false: '#CBD5E1', true: '#99D8C9' }}
                thumbColor={showAddress ? TEAL : '#F8FAFC'}
              />
            </View>

          {showAddress ? <>
            <View className="mb-3 flex-row items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <Text className="text-[11px] font-semibold text-slate-600">Use saved profile address</Text>
              <Switch value={useProfileAddress} disabled={isProfileAddressLoading || !profileAddress} onValueChange={setUseProfileAddress} trackColor={{ false: '#CBD5E1', true: '#99D8C9' }} thumbColor={useProfileAddress ? TEAL : '#F8FAFC'} />
            </View>

            {isProfileAddressLoading ? (
              <View className="mt-3 rounded-xl bg-slate-50 px-3 py-3">
                <Text className="text-[11px] text-slate-500">Loading your saved address…</Text>
              </View>
            ) : useProfileAddress && profileAddress ? (
              <View className="mt-3 rounded-xl bg-teal-50 px-3 py-3">
                <Text className="text-[11px] font-semibold leading-[18px] text-teal-900">{profileAddress}</Text>
              </View>
            ) : (
              <View className="mt-3">
                {!profileAddress ? (
                  <Text className="mb-2 text-[10px] leading-4 text-slate-500">
                    No address is saved in your profile. Enter a delivery address below.
                  </Text>
                ) : null}
                <View className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <TextInput
                    value={customAddress}
                    onChangeText={setCustomAddress}
                    placeholder="Street, city, state and nearby landmark"
                    placeholderTextColor="#94A3B8"
                    multiline
                    maxLength={500}
                    numberOfLines={3}
                    textAlignVertical="top"
                    returnKeyType="done"
                    className="min-h-[74px] text-[12px] leading-[18px] text-[#0F172A]"
                  />
                </View>
                <Text className="mt-1.5 text-right text-[9px] text-slate-400">
                  {customAddress.length}/500
                </Text>
              </View>
            )}
          </> : null}
          </View>

        </View>
      </ScrollView>

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
              {orderMethod === 'prescription' ? 'Uploading Prescription...' : 'Creating Order...'}
            </Text>
            <Text className="mt-1 text-center text-[12px] text-slate-500">
              Please wait while we process your {orderMethod === 'prescription' ? 'prescription' : 'order'}
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
