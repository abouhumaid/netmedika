import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PharmacyColors, CommonStyles } from '../../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

const API_URL = 'http://192.168.43.240:8000';

export default function AddressScreen() {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Load existing address if available
    loadAddress();

    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadAddress = async () => {
    try {
      const savedAddress = await AsyncStorage.getItem('userAddress');
      if (savedAddress) {
        setAddress(savedAddress);
      }
    } catch (error) {
      console.error('Error loading address:', error);
    }
  };

  const handleSaveAddress = async () => {
    // Validate
    if (!address.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Required Field',
        text2: 'Please enter your delivery address',
        position: 'top',
      });
      return;
    }

    try {
      setIsSaving(true);

      // Save to AsyncStorage
      await AsyncStorage.setItem('userAddress', address);

      // Optional: Save to backend
      // const token = await AsyncStorage.getItem('userToken');
      // await fetch(`${API_URL}/api/v1/user/address`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${token}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ address }),
      // });

      Toast.show({
        type: 'success',
        text1: 'Address Saved',
        text2: 'Your delivery address has been saved successfully',
        position: 'top',
      });

      // Navigate back after a short delay
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      console.error('Error saving address:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save address. Please try again.',
        position: 'top',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAddress = () => {
    Animated.sequence([
      Animated.spring(cardScale, {
        toValue: 0.95,
        tension: 100,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 100,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    setAddress('');
    Toast.show({
      type: 'info',
      text1: 'Address Cleared',
      position: 'top',
      visibilityTime: 1500,
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PharmacyColors.primary} />

      {/* Header */}
      <LinearGradient colors={PharmacyColors.gradientPrimary} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={isSaving}
          >
            <Ionicons name="arrow-back" size={24} color={PharmacyColors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Delivery Address</Text>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info Card */}
          <Animated.View
            style={[
              styles.infoCard,
              {
                opacity: fadeAnim,
                transform: [{ scale: cardScale }],
              },
            ]}
          >
            <LinearGradient
              colors={[PharmacyColors.accent + '15', PharmacyColors.accent + '05']}
              style={styles.infoCardGradient}
            >
              <Ionicons name="information-circle" size={24} color={PharmacyColors.accent} />
              <Text style={styles.infoText}>
                Provide your complete delivery address including street, city, and state
              </Text>
            </LinearGradient>
          </Animated.View>

          {/* Address Input Card */}
          <Animated.View
            style={[
              styles.addressCard,
              {
                opacity: fadeAnim,
                transform: [{ scale: cardScale }],
              },
            ]}
          >
            <View style={styles.labelRow}>
              <View style={styles.labelLeft}>
                <Ionicons name="location" size={20} color={PharmacyColors.accent} />
                <Text style={styles.label}>Your Address</Text>
                <Text style={styles.required}>*</Text>
              </View>
              {address.length > 0 && (
                <TouchableOpacity onPress={handleClearAddress} disabled={isSaving}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={[styles.textareaWrapper, isFocused && styles.textareaWrapperFocused]}>
              <TextInput
                style={styles.textarea}
                value={address}
                onChangeText={setAddress}
                placeholder="Enter your complete delivery address...Example:123 Main Street, Apartment 4B Ikeja, Lagos State Nigeria"
                placeholderTextColor={PharmacyColors.gray}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                editable={!isSaving}
              />
            </View>

            {/* Character Count */}
            <Text style={styles.characterCount}>{address.length} characters</Text>
          </Animated.View>

          {/* Save Button */}
          <Animated.View
            style={[
              styles.buttonContainer,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveAddress}
              disabled={isSaving || !address.trim()}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  isSaving || !address.trim()
                    ? [PharmacyColors.gray, PharmacyColors.gray]
                    : PharmacyColors.gradientAccent
                }
                style={styles.saveButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isSaving ? (
                  <Text style={styles.saveButtonText}>Saving...</Text>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={22} color={PharmacyColors.white} />
                    <Text style={styles.saveButtonText}>Save Address</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PharmacyColors.background,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: PharmacyColors.white,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  infoCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  infoCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: PharmacyColors.textPrimary,
    marginLeft: 12,
    lineHeight: 18,
  },
  addressCard: {
    backgroundColor: PharmacyColors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    ...CommonStyles.shadowMedium,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  labelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: PharmacyColors.textPrimary,
    marginLeft: 8,
  },
  required: {
    color: PharmacyColors.error,
    marginLeft: 4,
    fontSize: 16,
  },
  clearText: {
    fontSize: 14,
    fontWeight: '600',
    color: PharmacyColors.error,
  },
  textareaWrapper: {
    backgroundColor: PharmacyColors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  textareaWrapperFocused: {
    borderColor: PharmacyColors.accent,
    backgroundColor: PharmacyColors.white,
    ...CommonStyles.shadow,
  },
  textarea: {
    fontSize: 15,
    color: PharmacyColors.textPrimary,
    padding: 16,
    minHeight: 160,
    lineHeight: 22,
  },
  characterCount: {
    fontSize: 12,
    color: PharmacyColors.textSecondary,
    textAlign: 'right',
    marginTop: 8,
  },
  tipsCard: {
    backgroundColor: PharmacyColors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    ...CommonStyles.shadow,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: PharmacyColors.textPrimary,
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: PharmacyColors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  buttonContainer: {
    marginTop: 4,
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    ...CommonStyles.shadow,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PharmacyColors.white,
    marginLeft: 8,
  },
});