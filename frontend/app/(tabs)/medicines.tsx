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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PharmacyColors } from '../../constants/Colors';
import * as ImagePicker from 'expo-image-picker';

const API_URL = 'http://192.168.43.240:8000';

export default function MedicinesScreen({ navigation }: any) {
  const [search, setSearch] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Animations
  const searchScaleAnim = useRef(new Animated.Value(1)).current;
  const uploadScaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.spring(uploadScaleAnim, { toValue: 1, delay: 300, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();

    // DEBUG: Check if token exists on mount
    checkToken();
  }, []);

  // ===============================
  // DEBUG: CHECK TOKEN
  // ===============================
  const checkToken = async () => {
    const token = await AsyncStorage.getItem('userToken');
    console.log('Token on screen load:', token ? 'EXISTS' : 'NOT FOUND');
    if (!token) {
      Alert.alert('Session Expired', 'Please log in again', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    }
  };

  // ===============================
  // FOCUS ANIMATIONS
  // ===============================
  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(searchScaleAnim, { toValue: 1.05, friction: 6, useNativeDriver: true }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(searchScaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  };

  // ===============================
  // SAVE ORDER FUNCTION
  // ===============================
  const saveOrder = async (medicineName?: string, imageUri?: string) => {
    try {
      setIsProcessing(true);

      const token = await AsyncStorage.getItem('userToken');
      console.log('Token retrieved:', token ? 'YES' : 'NO');
      
      if (!token) {
        Alert.alert('Authentication Required', 'Please log in to place an order', [
          { text: 'Login', onPress: () => navigation.navigate('Login') },
          { text: 'Cancel', style: 'cancel' }
        ]);
        return;
      }

      const formData = new FormData();
      
      if (medicineName) {
        formData.append('medicine_name', medicineName);
      }
      
      if (imageUri) {
        const filename = imageUri.split('/').pop() || 'prescription.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('uploaded_image', {
          uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
          type: type,
          name: filename,
        } as any);
      }

      console.log('Sending request to:', `${API_URL}/api/v1/orders/create`);
      console.log('With token:', token.substring(0, 20) + '...');

      const response = await fetch(`${API_URL}/api/v1/orders/create`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type for FormData - let the browser set it with boundary
        },
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        Alert.alert('Success', `Order created! Order ID: ${data.order_id}`);
        setSearch('');
        setUploadedImage(null);
      } else {
        throw new Error(data.detail || 'Failed to create order');
      }
    } catch (error: any) {
      console.error('Save order error:', error);
      Alert.alert('Error', error.message || 'Could not save order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ===============================
  // SEARCH HANDLER
  // ===============================
  const handleSaveSearch = () => {
    if (!search.trim()) {
      Alert.alert('Error', 'Please enter medicine name');
      return;
    }
    saveOrder(search);
  };

  // ===============================
  // IMAGE UPLOAD HANDLER
  // ===============================
  const showUploadOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Take Photo', 'Choose from Gallery'], cancelButtonIndex: 0 },
        (buttonIndex) => {
          if (buttonIndex === 1) pickImage(true);
          else if (buttonIndex === 2) pickImage(false);
        }
      );
    } else {
      Alert.alert('Upload Prescription', 'Choose an option', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => pickImage(true) },
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
          Animated.spring(uploadScaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
        ]).start();

        // Save the order with uploaded image
        saveOrder(undefined, imageUri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removeImage = () => {
    Alert.alert('Remove Prescription', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setUploadedImage(null) },
    ]);
  };

  // ===============================
  // RENDER
  // ===============================
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* FULLSCREEN SPINNER OVERLAY */}
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

        {/* Search Section */}
        <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ scale: searchScaleAnim }, { translateY: slideAnim }] }]}>
          <View style={[styles.searchBox, isFocused && styles.searchBoxFocused]}>
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
            <Pressable
              onPress={handleSaveSearch}
              style={[
                styles.searchButton,
                (!search.trim() || isProcessing) && styles.searchButtonDisabled
              ]}
              disabled={isProcessing || !search.trim()}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={PharmacyColors.white} />
              ) : (
                <Text style={styles.searchButtonText}>Order</Text>
              )}
            </Pressable>
          </View>
        </Animated.View>

        {/* Divider */}
        <Animated.View style={[styles.divider, { opacity: fadeAnim }]}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </Animated.View>

        {/* Upload Section */}
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
                  <Ionicons name="sync" size={18} color={PharmacyColors.accent} />
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

        {/* Info Card */}
        <Animated.View style={[styles.infoCard, { opacity: fadeAnim }]}>
          <Ionicons name="information-circle" size={20} color={PharmacyColors.accent} style={styles.infoIcon} />
          <Text style={styles.infoText}>Upload a clear photo of your prescription for faster processing</Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ===============================
// STYLES
// ===============================
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PharmacyColors.background },
  scrollView: { flex: 1 },
  scrollContent: { padding: 24, paddingTop: Platform.OS === 'ios' ? 20 : 40, paddingBottom: 100 },
  headerContainer: { alignItems: 'center', marginBottom: 32 },
  headerText: { fontSize: 28, fontWeight: 'bold', color: PharmacyColors.textPrimary, textAlign: 'center', letterSpacing: 0.5 },
  subHeaderText: { fontSize: 15, color: PharmacyColors.textSecondary, textAlign: 'center', marginTop: 8, letterSpacing: 0.3 },
  section: { marginBottom: 24 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: PharmacyColors.white, borderRadius: 16, paddingLeft: 20, paddingRight: 6, paddingVertical: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 6, borderWidth: 2, borderColor: 'transparent' },
  searchBoxFocused: { borderColor: PharmacyColors.accent, shadowOpacity: 0.15 },
  input: { flex: 1, fontSize: 17, color: PharmacyColors.textPrimary, fontWeight: '500', letterSpacing: 0.3, paddingVertical: 14 },
  searchButton: { 
    backgroundColor: PharmacyColors.accent, 
    paddingHorizontal: 24,
    height: 48, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
    minWidth: 90,
  },
  searchButtonDisabled: {
    backgroundColor: PharmacyColors.gray + '60',
    opacity: 0.6,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: PharmacyColors.white,
    letterSpacing: 0.5,
  },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: PharmacyColors.gray + '40' },
  dividerText: { fontSize: 14, fontWeight: '600', color: PharmacyColors.textSecondary, marginHorizontal: 16, letterSpacing: 1 },
  uploadButton: { backgroundColor: PharmacyColors.white, borderRadius: 16, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 6, borderWidth: 2, borderColor: PharmacyColors.accent + '20', borderStyle: 'dashed' },
  uploadIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: PharmacyColors.accent + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  uploadButtonTitle: { fontSize: 18, fontWeight: 'bold', color: PharmacyColors.textPrimary, marginBottom: 8, letterSpacing: 0.3 },
  uploadButtonSubtitle: { fontSize: 14, color: PharmacyColors.textSecondary, textAlign: 'center', letterSpacing: 0.2 },
  imagePreviewContainer: { backgroundColor: PharmacyColors.white, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 6 },
  imagePreview: { alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: PharmacyColors.gray + '30', marginBottom: 16 },
  imagePreviewText: { fontSize: 15, color: PharmacyColors.textPrimary, marginTop: 12, fontWeight: '500', textAlign: 'center' },
  imageActions: { flexDirection: 'row', justifyContent: 'space-around' },
  changeButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, backgroundColor: PharmacyColors.accent + '15' },
  changeButtonText: { fontSize: 15, fontWeight: '600', color: PharmacyColors.accent, marginLeft: 6 },
  removeButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, backgroundColor: PharmacyColors.error + '15' },
  removeButtonText: { fontSize: 15, fontWeight: '600', color: PharmacyColors.error, marginLeft: 6 },
  infoCard: { flexDirection: 'row', backgroundColor: PharmacyColors.accent + '10', padding: 16, borderRadius: 12, marginTop: 16, marginBottom: 20 },
  infoIcon: { marginRight: 12, marginTop: 2 },
  infoText: { flex: 1, fontSize: 13, color: PharmacyColors.textSecondary, lineHeight: 20, letterSpacing: 0.2 },
  spinnerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  spinnerText: {
    marginTop: 16,
    fontSize: 16,
    color: PharmacyColors.white,
    fontWeight: '600',
  },
});