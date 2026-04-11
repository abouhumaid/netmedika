import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  Pressable,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Platform,
  ActionSheetIOS,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PharmacyColors } from '../../constants/Colors';
import * as ImagePicker from 'expo-image-picker';

const API_URL = 'http://100.53.230.81:8000';

const MEDICINE_TYPES = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops'];
const DOSAGE_OPTIONS = [
  'TDS-1/7', 'TDS-2/7', 'TDS-3/7', 'TDS-4/7', 'TDS-5/7', 'TDS-6/7', 'TDS-7/7',
  'BD-1/7',  'BD-2/7',  'BD-3/7',  'BD-4/7',  'BD-5/7',  'BD-6/7',  'BD-7/7',
  'OD-1/7',  'OD-2/7',  'OD-3/7',  'OD-4/7',  'OD-5/7',  'OD-6/7',  'OD-7/7',
];

export default function MedicinesScreen({ navigation }: any) {
  const [search, setSearch]             = useState('');
  const [medicineType, setMedicineType] = useState('');
  const [strength, setStrength]         = useState('');
  const [dosage, setDosage]             = useState('');
  const [isFocused, setIsFocused]       = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Dropdown modals
  const [showTypeModal, setShowTypeModal]     = useState(false);
  const [showDosageModal, setShowDosageModal] = useState(false);

  // ── Delivery Address Modal ───────────────────────────────────────────────
  const [showAddressModal, setShowAddressModal]   = useState(false);
  const [deliveryAddress, setDeliveryAddress]     = useState('');
  const [addressError, setAddressError]           = useState('');
  // We hold the pending order payload here so we can submit it after address is confirmed
  const pendingOrderRef = useRef<{ medicineName?: string; imageUri?: string } | null>(null);

  // Animations
  const searchScaleAnim = useRef(new Animated.Value(1)).current;
  const uploadScaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim        = useRef(new Animated.Value(0)).current;
  const slideAnim       = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,       { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim,      { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.spring(uploadScaleAnim,{ toValue: 1, delay: 300, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();

    checkToken();
  }, []);

  // ── Auth check ────────────────────────────────────────────────────────────
  const checkToken = async () => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      Alert.alert('Session Expired', 'Please log in again', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    }
  };

  // ── Focus animations ──────────────────────────────────────────────────────
  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(searchScaleAnim, { toValue: 1.05, friction: 6, useNativeDriver: true }).start();
  };
  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(searchScaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  };

  // ── Form completeness ─────────────────────────────────────────────────────
  const isFormComplete = () =>
    medicineType.trim() !== '' &&
    search.trim()       !== '' &&
    strength.trim()     !== '' &&
    dosage.trim()       !== '';

  // ── Address modal helpers ─────────────────────────────────────────────────
  /**
   * Opens the delivery-address modal.
   * `isRequired` = true when ordering by medicine name;
   * `isRequired` = false when only a prescription image is uploaded.
   */
  const openAddressModal = (payload: { medicineName?: string; imageUri?: string }) => {
    pendingOrderRef.current = payload;
    setDeliveryAddress('');
    setAddressError('');
    setShowAddressModal(true);
  };

  const handleAddressConfirm = () => {
    const isMedicineOrder = !!pendingOrderRef.current?.medicineName;
    const trimmed         = deliveryAddress.trim();

    // Address is required for medicine-name orders
    if (isMedicineOrder && trimmed.length === 0) {
      setAddressError('Delivery address is required.');
      return;
    }
    if (trimmed.length > 0 && trimmed.length < 10) {
      setAddressError('Please enter a valid address (at least 10 characters).');
      return;
    }

    setShowAddressModal(false);
    const { medicineName, imageUri } = pendingOrderRef.current!;
    saveOrder(medicineName, imageUri, trimmed || undefined);
  };

  const handleAddressSkip = () => {
    // Only reachable for prescription-image orders (address is optional)
    setShowAddressModal(false);
    const { medicineName, imageUri } = pendingOrderRef.current!;
    saveOrder(medicineName, imageUri, undefined);
  };

  // ── Core save function ────────────────────────────────────────────────────
  const saveOrder = async (
    medicineName?:    string,
    imageUri?:        string,
    deliveryAddress?: string,
  ) => {
    try {
      setIsProcessing(true);

      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Authentication Required', 'Please log in to place an order', [
          { text: 'Login',  onPress: () => navigation.navigate('Login') },
          { text: 'Cancel', style: 'cancel' },
        ]);
        return;
      }

      const formData = new FormData();

      if (medicineName) {
        formData.append('dosage_form',    medicineType);
        formData.append('medicine_name',  medicineName);
        formData.append('strength',       strength);
        formData.append('frequency',      dosage);
      }

      if (deliveryAddress) {
        formData.append('delivery_address', deliveryAddress);
      }

      if (imageUri) {
        const filename = imageUri.split('/').pop() || 'prescription.jpg';
        const match    = /\.(\w+)$/.exec(filename);
        const type     = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('uploaded_image', {
          uri:  Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
          type: type,
          name: filename,
        } as any);
      }

      const response = await fetch(`${API_URL}/api/v1/orders/create`, {
        method:  'POST',
        body:    formData,
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success ✅', `Order placed!\nOrder ID: ${data.order_id}`);
        // Reset form
        setSearch('');
        setMedicineType('');
        setStrength('');
        setDosage('');
        setUploadedImage(null);
        setDeliveryAddress('');
      } else {
        throw new Error(data.detail || 'Failed to create order');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not save order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Trigger: medicine-name order ──────────────────────────────────────────
  const handleSaveSearch = () => {
    if (!isFormComplete()) {
      Alert.alert('Incomplete Form', 'Please fill all fields before placing an order.');
      return;
    }
    // Address is REQUIRED — open modal, no skip button shown
    openAddressModal({ medicineName: search });
  };

  // ── Trigger: prescription image order ────────────────────────────────────
  const showUploadOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Take Photo', 'Choose from Gallery'], cancelButtonIndex: 0 },
        (buttonIndex) => {
          if (buttonIndex === 1) pickImage(true);
          else if (buttonIndex === 2) pickImage(false);
        },
      );
    } else {
      Alert.alert('Upload Prescription', 'Choose an option', [
        { text: 'Cancel',              style: 'cancel' },
        { text: 'Take Photo',          onPress: () => pickImage(true)  },
        { text: 'Choose from Gallery', onPress: () => pickImage(false) },
      ]);
    }
  };

  const pickImage = async (fromCamera: boolean) => {
    try {
      let result;
      if (fromCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Denied', 'Camera permission is required');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Denied', 'Gallery permission is required');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setUploadedImage(imageUri);

        Animated.sequence([
          Animated.spring(uploadScaleAnim, { toValue: 1.1, friction: 6, useNativeDriver: true }),
          Animated.spring(uploadScaleAnim, { toValue: 1,   friction: 6, useNativeDriver: true }),
        ]).start();

        // Address is OPTIONAL for image orders — modal shows a "Skip" button
        openAddressModal({ imageUri });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removeImage = () => {
    Alert.alert('Remove Prescription', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setUploadedImage(null) },
    ]);
  };

  // ── Reusable dropdown modal ───────────────────────────────────────────────
  const renderDropdownModal = (
    visible:  boolean,
    onClose:  () => void,
    options:  string[],
    onSelect: (value: string) => void,
    title:    string,
  ) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={PharmacyColors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.modalOption}
                onPress={() => { onSelect(option); onClose(); }}
              >
                <Text style={styles.modalOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // ── Delivery address modal ────────────────────────────────────────────────
  const isImageOnlyOrder    = !pendingOrderRef.current?.medicineName;
  const addressIsRequired   = !isImageOnlyOrder;

  const renderAddressModal = () => (
    <Modal
      visible={showAddressModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowAddressModal(false)}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            // Allow dismissing only if address is optional
            if (isImageOnlyOrder) setShowAddressModal(false);
          }}
        >
          {/* Prevent taps inside the card from closing the modal */}
          <TouchableOpacity activeOpacity={1} style={styles.addressModalCard}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.addressModalHeaderLeft}>
                <Ionicons name="location" size={22} color={PharmacyColors.accent} />
                <Text style={styles.modalTitle}>Delivery Address</Text>
              </View>
              {isImageOnlyOrder && (
                <TouchableOpacity onPress={() => setShowAddressModal(false)}>
                  <Ionicons name="close" size={24} color={PharmacyColors.textPrimary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Sub-label */}
            <Text style={styles.addressSubLabel}>
              {addressIsRequired
                ? 'Enter where you want your medicine delivered.'
                : 'Optionally add a delivery address. You can skip and let the admin confirm it with you later.'}
            </Text>

            {/* Input */}
            <TextInput
              style={[styles.addressInput, addressError ? styles.addressInputError : null]}
              placeholder="e.g. 12 Kano Road, Bompai, Kano State"
              placeholderTextColor={PharmacyColors.gray}
              value={deliveryAddress}
              onChangeText={(text) => {
                setDeliveryAddress(text);
                if (addressError) setAddressError('');
              }}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              returnKeyType="done"
              autoFocus
            />

            {/* Inline error */}
            {addressError ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={16} color={PharmacyColors.error} />
                <Text style={styles.errorText}>{addressError}</Text>
              </View>
            ) : null}

            {/* Actions */}
            <View style={styles.addressActions}>
              {/* Skip — only shown for prescription-image orders */}
              {isImageOnlyOrder && (
                <TouchableOpacity style={styles.skipButton} onPress={handleAddressSkip}>
                  <Text style={styles.skipButtonText}>Skip</Text>
                </TouchableOpacity>
              )}

              <Pressable
                style={[
                  styles.confirmButton,
                  isImageOnlyOrder && styles.confirmButtonFlex,
                ]}
                onPress={handleAddressConfirm}
              >
                <Ionicons name="checkmark-circle" size={20} color={PharmacyColors.white} />
                <Text style={styles.confirmButtonText}>Confirm & Place Order</Text>
              </Pressable>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Fullscreen spinner */}
      {isProcessing && (
        <View style={styles.spinnerOverlay}>
          <ActivityIndicator size="large" color={PharmacyColors.accent} />
          <Text style={styles.spinnerText}>Processing your order...</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Animated.View style={[styles.headerContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.headerText}>Order Your Medicine</Text>
        </Animated.View>

        {/* Search / Medicine-name section */}
        <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ scale: searchScaleAnim }, { translateY: slideAnim }] }]}>
          <View style={[styles.searchBox, isFocused && styles.searchBoxFocused]}>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowTypeModal(true)}
              disabled={isProcessing}
            >
              <Text style={[styles.dropdownText, !medicineType && styles.dropdownPlaceholder]}>
                {medicineType || 'Type'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={PharmacyColors.gray} />
            </TouchableOpacity>
            <View style={styles.dividerVertical} />
            <TextInput
              style={styles.input}
              placeholder="Enter medicine name..."
              placeholderTextColor={PharmacyColors.gray}
              value={search}
              onChangeText={setSearch}
              onFocus={handleFocus}
              onBlur={handleBlur}
              returnKeyType="done"
              editable={!isProcessing}
            />
          </View>

          {medicineType && search.trim() && (
            <Animated.View style={styles.fieldContainer}>
              <TextInput
                style={styles.fullWidthInput}
                placeholder="Strength (e.g., 500mg, 10ml, 5%)"
                placeholderTextColor={PharmacyColors.gray}
                value={strength}
                onChangeText={setStrength}
                returnKeyType="done"
                editable={!isProcessing}
              />
            </Animated.View>
          )}

          {medicineType && search.trim() && strength.trim() && (
            <Animated.View style={styles.fieldContainer}>
              <TouchableOpacity
                style={styles.fullWidthDropdown}
                onPress={() => setShowDosageModal(true)}
                disabled={isProcessing}
              >
                <Text style={[styles.dropdownText, !dosage && styles.dropdownPlaceholder]}>
                  {dosage || 'Select Dosage'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={PharmacyColors.gray} />
              </TouchableOpacity>
            </Animated.View>
          )}

          <Pressable
            onPress={handleSaveSearch}
            style={[styles.orderButton, !isFormComplete() && styles.orderButtonDisabled]}
            disabled={isProcessing || !isFormComplete()}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={PharmacyColors.white} />
            ) : (
              <>
                <Ionicons name="cart" size={20} color={PharmacyColors.white} style={{ marginRight: 8 }} />
                <Text style={styles.orderButtonText}>Place Order</Text>
              </>
            )}
          </Pressable>
        </Animated.View>

        {/* Divider */}
        <Animated.View style={[styles.divider, { opacity: fadeAnim }]}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </Animated.View>

        {/* Upload / prescription-image section */}
        <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ scale: uploadScaleAnim }] }]}>
          {!uploadedImage ? (
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={showUploadOptions}
              activeOpacity={0.7}
              disabled={isProcessing}
            >
              <View style={styles.uploadIconCircle}>
                <Ionicons name="cloud-upload" size={40} color={PharmacyColors.accent} />
              </View>
              <Text style={styles.uploadButtonTitle}>Upload Prescription</Text>
              <Text style={styles.uploadButtonSubtitle}>Take a photo or choose from gallery</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.imagePreviewContainer}>
              <View style={styles.imagePreview}>
                <Ionicons name="checkmark-circle" size={48} color="#4caf50" />
                <Text style={styles.imagePreviewText}>Prescription uploaded successfully!</Text>
              </View>
              <View style={styles.imageActions}>
                <TouchableOpacity style={styles.changeButton} onPress={showUploadOptions}>
                  <Ionicons name="sync"  size={18} color={PharmacyColors.accent} />
                  <Text style={styles.changeButtonText}>Change</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.removeButton} onPress={removeImage}>
                  <Ionicons name="trash" size={18} color={PharmacyColors.error} />
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Info card */}
        <Animated.View style={[styles.infoCard, { opacity: fadeAnim }]}>
          <Ionicons name="information-circle" size={20} color={PharmacyColors.accent} style={styles.infoIcon} />
          <Text style={styles.infoText}>
            Upload a clear photo of your prescription for faster processing
          </Text>
        </Animated.View>
      </ScrollView>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {renderDropdownModal(showTypeModal,   () => setShowTypeModal(false),   MEDICINE_TYPES,  setMedicineType, 'Select Medicine Type')}
      {renderDropdownModal(showDosageModal, () => setShowDosageModal(false), DOSAGE_OPTIONS,  setDosage,       'Select Dosage')}
      {renderAddressModal()}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea:        { flex: 1, backgroundColor: PharmacyColors.background },
  scrollView:      { flex: 1 },
  scrollContent:   { padding: 24, paddingTop: Platform.OS === 'ios' ? 20 : 40, paddingBottom: 100 },
  headerContainer: { alignItems: 'center', marginBottom: 32 },
  headerText:      { fontSize: 28, fontWeight: 'bold', color: PharmacyColors.textPrimary, textAlign: 'center', letterSpacing: 0.5 },
  section:         { marginBottom: 24 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: PharmacyColors.white,
    borderRadius: 16, paddingVertical: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 6,
    borderWidth: 2, borderColor: 'transparent', marginBottom: 12,
  },
  searchBoxFocused: { borderColor: PharmacyColors.accent, shadowOpacity: 0.15 },

  dropdownButton:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, minWidth: 100 },
  dropdownText:       { fontSize: 16, fontWeight: '600', color: PharmacyColors.textPrimary, marginRight: 8 },
  dropdownPlaceholder:{ color: PharmacyColors.gray, fontWeight: '500' },
  dividerVertical:    { width: 1, height: 40, backgroundColor: PharmacyColors.gray + '30' },

  input: {
    flex: 1, fontSize: 17, color: PharmacyColors.textPrimary, fontWeight: '500',
    letterSpacing: 0.3, paddingVertical: 14, paddingHorizontal: 16,
  },
  fieldContainer: { marginBottom: 12 },
  fullWidthInput: {
    backgroundColor: PharmacyColors.white, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 18,
    fontSize: 17, color: PharmacyColors.textPrimary, fontWeight: '500',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 6,
    borderWidth: 2, borderColor: 'transparent',
  },
  fullWidthDropdown: {
    backgroundColor: PharmacyColors.white, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 6,
    borderWidth: 2, borderColor: 'transparent',
  },

  orderButton: {
    backgroundColor: PharmacyColors.accent, paddingVertical: 18, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', flexDirection: 'row', marginTop: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  orderButtonDisabled: { backgroundColor: PharmacyColors.gray + '60', opacity: 0.6 },
  orderButtonText:     { fontSize: 18, fontWeight: '700', color: PharmacyColors.white, letterSpacing: 0.5 },

  divider:     { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: PharmacyColors.gray + '40' },
  dividerText: { fontSize: 14, fontWeight: '600', color: PharmacyColors.textSecondary, marginHorizontal: 16, letterSpacing: 1 },

  uploadButton: {
    backgroundColor: PharmacyColors.white, borderRadius: 16, padding: 32, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 6,
    borderWidth: 2, borderColor: PharmacyColors.accent + '20', borderStyle: 'dashed',
  },
  uploadIconCircle:    { width: 100, height: 100, borderRadius: 50, backgroundColor: PharmacyColors.accent + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  uploadButtonTitle:   { fontSize: 18, fontWeight: 'bold', color: PharmacyColors.textPrimary, marginBottom: 8, letterSpacing: 0.3 },
  uploadButtonSubtitle:{ fontSize: 14, color: PharmacyColors.textSecondary, textAlign: 'center', letterSpacing: 0.2 },

  imagePreviewContainer: { backgroundColor: PharmacyColors.white, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 6 },
  imagePreview:          { alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: PharmacyColors.gray + '30', marginBottom: 16 },
  imagePreviewText:      { fontSize: 15, color: PharmacyColors.textPrimary, marginTop: 12, fontWeight: '500', textAlign: 'center' },
  imageActions:          { flexDirection: 'row', justifyContent: 'space-around' },
  changeButton:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, backgroundColor: PharmacyColors.accent + '15' },
  changeButtonText:      { fontSize: 15, fontWeight: '600', color: PharmacyColors.accent, marginLeft: 6 },
  removeButton:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, backgroundColor: PharmacyColors.error + '15' },
  removeButtonText:      { fontSize: 15, fontWeight: '600', color: PharmacyColors.error, marginLeft: 6 },

  infoCard: { flexDirection: 'row', backgroundColor: PharmacyColors.accent + '10', padding: 16, borderRadius: 12, marginTop: 16, marginBottom: 20 },
  infoIcon: { marginRight: 12, marginTop: 2 },
  infoText: { flex: 1, fontSize: 13, color: PharmacyColors.textSecondary, lineHeight: 20, letterSpacing: 0.2 },

  spinnerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  spinnerText:    { marginTop: 16, fontSize: 16, color: PharmacyColors.white, fontWeight: '600' },

  // ── Generic dropdown modal ──────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: PharmacyColors.white, borderRadius: 20, width: '100%', maxHeight: '70%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 10 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: PharmacyColors.gray + '30' },
  modalTitle:   { fontSize: 18, fontWeight: 'bold', color: PharmacyColors.textPrimary },
  modalScroll:  { maxHeight: 400 },
  modalOption:  { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: PharmacyColors.gray + '20' },
  modalOptionText: { fontSize: 16, color: PharmacyColors.textPrimary, fontWeight: '500' },

  // ── Delivery address modal ──────────────────────────────────────────────
  addressModalCard: {
    backgroundColor: PharmacyColors.white,
    borderRadius: 24,
    width: '100%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  addressModalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addressSubLabel: {
    fontSize: 14,
    color: PharmacyColors.textSecondary,
    marginTop: 12,
    marginBottom: 16,
    lineHeight: 20,
  },
  addressInput: {
    borderWidth: 2,
    borderColor: PharmacyColors.gray + '40',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: PharmacyColors.textPrimary,
    minHeight: 90,
    backgroundColor: PharmacyColors.background,
  },
  addressInputError: { borderColor: PharmacyColors.error },
  errorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  errorText: { fontSize: 13, color: PharmacyColors.error, flex: 1 },

  addressActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: PharmacyColors.gray + '50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: { fontSize: 16, fontWeight: '600', color: PharmacyColors.textSecondary },

  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: PharmacyColors.accent,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmButtonFlex: { flex: 1 },   // full width when no skip button
  confirmButtonText: { fontSize: 16, fontWeight: '700', color: PharmacyColors.white },
});