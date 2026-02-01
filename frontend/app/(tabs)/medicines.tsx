import React, { useEffect, useRef, useState } from 'react';
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

type Medicine = {
  generic_name: string;
  brand_names: string[];
  drug_class: string;
  dosage_forms: string[];
  common_dosages: string;
  requires_prescription: boolean;
};

export default function MedicinesScreen({ navigation }: any) {
  const [search, setSearch] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Animations
  const searchScaleAnim = useRef(new Animated.Value(1)).current;
  const uploadScaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(uploadScaleAnim, {
        toValue: 1,
        delay: 300,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(searchScaleAnim, {
      toValue: 1.05,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(searchScaleAnim, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  const handleSearch = async () => {
    if (!search.trim()) {
      Alert.alert('Search Empty', 'Please enter a medicine name');
      return;
    }

    try {
      setIsSearching(true);

      const response = await fetch(
        `${API_URL}/api/v1/medicine/search?q=${encodeURIComponent(search)}`
      );

      const data: Medicine = await response.json();

      if (!response.ok) {
        throw new Error('Medicine not found');
      }

      Alert.alert('Success', `Found: ${data.generic_name}`);

    } catch (error) {
      console.error('Search error:', error);
      Alert.alert(
        'Search Failed',
        'Could not find medicine. Please check the name and try again.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  // ========================================
  // MERGED UPLOAD OPTIONS - ACTION SHEET
  // ========================================
  const showUploadOptions = () => {
    if (Platform.OS === 'ios') {
      // iOS Action Sheet
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Gallery'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            pickImage(true); // Camera
          } else if (buttonIndex === 2) {
            pickImage(false); // Gallery
          }
        }
      );
    } else {
      // Android Alert Dialog
      Alert.alert(
        'Upload Prescription',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Take Photo',
            onPress: () => pickImage(true),
          },
          {
            text: 'Choose from Gallery',
            onPress: () => pickImage(false),
          },
        ],
        { cancelable: true }
      );
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

        // Animate success
        Animated.sequence([
          Animated.spring(uploadScaleAnim, {
            toValue: 1.1,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.spring(uploadScaleAnim, {
            toValue: 1,
            friction: 6,
            useNativeDriver: true,
          }),
        ]).start();

        await uploadPrescription(imageUri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadPrescription = async (imageUri: string) => {
    try {
      setIsUploading(true);

      const formData = new FormData();
      formData.append('prescription', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'prescription.jpg',
      } as any);

      const response = await fetch(
        `${API_URL}/api/v1/prescription/upload`,
        {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      Alert.alert(
        'Success',
        'Prescription uploaded successfully!'
      );

    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert(
        'Upload Failed',
        'Could not upload prescription. Please try again.'
      );
      setUploadedImage(null);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    Alert.alert(
      'Remove Prescription',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            Animated.timing(uploadScaleAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              setUploadedImage(null);
              Animated.spring(uploadScaleAnim, {
                toValue: 1,
                friction: 6,
                useNativeDriver: true,
              }).start();
            });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Animated.View
          style={[
            styles.headerContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* <Ionicons
            name="medical"
            size={32}
            color={PharmacyColors.accent}
            style={styles.headerIcon}
          /> */}
          <Text style={styles.headerText}>Order Your Medicine</Text>
          <Text style={styles.subHeaderText}>
            Enter a medication name or upload prescription
          </Text>
        </Animated.View>

        {/* Search Section */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [
                { scale: searchScaleAnim },
                { translateY: slideAnim },
              ],
            },
          ]}
        >
          

          <View
            style={[
              styles.searchBox,
              isFocused && styles.searchBoxFocused,
            ]}
          >
            <TextInput
              style={styles.input}
              placeholder="Enter medicine name..."
              placeholderTextColor={PharmacyColors.gray}
              value={search}
              onChangeText={setSearch}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              editable={!isSearching}
            />

            <Pressable 
              onPress={handleSearch} 
              style={styles.searchButton}
              disabled={isSearching || !search.trim()}
            >
              {isSearching ? (
                <ActivityIndicator size="small" color={PharmacyColors.white} />
              ) : (
                <Animated.View
                  style={{
                    transform: [
                      {
                        rotate: isFocused ? '15deg' : '0deg',
                      },
                    ],
                  }}
                >
                  <Ionicons
                    name="paper-plane"
                    size={22}
                    color={PharmacyColors.white}
                  />
                </Animated.View>
              )}
            </Pressable>
          </View>
        </Animated.View>

        {/* Divider */}
        <Animated.View
          style={[
            styles.divider,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </Animated.View>

        {/* Upload Section - MERGED INTO ONE BUTTON */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ scale: uploadScaleAnim }],
            },
          ]}
        >

          {!uploadedImage ? (
            // SINGLE UPLOAD BUTTON
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={showUploadOptions}
              activeOpacity={0.7}
              disabled={isUploading}
            >
              <View style={styles.uploadIconCircle}>
                <Ionicons
                  name="cloud-upload"
                  size={40}
                  color={PharmacyColors.accent}
                />
              </View>
              <Text style={styles.uploadButtonTitle}>Upload Prescription</Text>
              <Text style={styles.uploadButtonSubtitle}>
                Take a photo or choose from gallery
              </Text>
            </TouchableOpacity>
          ) : (
            // UPLOADED STATE
            <View style={styles.imagePreviewContainer}>
              {isUploading ? (
                <View style={styles.uploadingContainer}>
                  <ActivityIndicator size="large" color={PharmacyColors.accent} />
                  <Text style={styles.uploadingText}>Uploading...</Text>
                </View>
              ) : (
                <>
                  <View style={styles.imagePreview}>
                    <Ionicons
                      name="checkmark-circle"
                      size={48}
                      color="#4caf50"
                    />
                    <Text style={styles.imagePreviewText}>
                      Prescription uploaded successfully!
                    </Text>
                  </View>

                  <View style={styles.imageActions}>
                    <TouchableOpacity
                      style={styles.changeButton}
                      onPress={showUploadOptions}
                    >
                      <Ionicons name="sync" size={18} color={PharmacyColors.accent} />
                      <Text style={styles.changeButtonText}>Change</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={removeImage}
                    >
                      <Ionicons name="trash" size={18} color={PharmacyColors.error} />
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}
        </Animated.View>

        {/* Info Card */}
        <Animated.View
          style={[
            styles.infoCard,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Ionicons
            name="information-circle"
            size={20}
            color={PharmacyColors.accent}
            style={styles.infoIcon}
          />
          <Text style={styles.infoText}>
            Upload a clear photo of your prescription for faster processing
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PharmacyColors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 100,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerIcon: {
    marginBottom: 12,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: PharmacyColors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subHeaderText: {
    fontSize: 15,
    color: PharmacyColors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.3,
  },
  section: {
    marginBottom: 24,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PharmacyColors.white,
    borderRadius: 16,
    paddingLeft: 20,
    paddingRight: 6,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  searchBoxFocused: {
    borderColor: PharmacyColors.accent,
    shadowOpacity: 0.15,
  },
  input: {
    flex: 1,
    fontSize: 17,
    color: PharmacyColors.textPrimary,
    fontWeight: '500',
    letterSpacing: 0.3,
    paddingVertical: 14,
  },
  searchButton: {
    backgroundColor: PharmacyColors.accent,
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: PharmacyColors.gray + '40',
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '600',
    color: PharmacyColors.textSecondary,
    marginHorizontal: 16,
    letterSpacing: 1,
  },
  // ========================================
  // MERGED UPLOAD BUTTON STYLES
  // ========================================
  uploadButton: {
    backgroundColor: PharmacyColors.white,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: PharmacyColors.accent + '20',
    borderStyle: 'dashed',
  },
  uploadIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: PharmacyColors.accent + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadButtonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PharmacyColors.textPrimary,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  uploadButtonSubtitle: {
    fontSize: 14,
    color: PharmacyColors.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  imagePreviewContainer: {
    backgroundColor: PharmacyColors.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  uploadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  uploadingText: {
    marginTop: 16,
    fontSize: 15,
    color: PharmacyColors.textSecondary,
    fontWeight: '500',
  },
  imagePreview: {
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: PharmacyColors.gray + '30',
    marginBottom: 16,
  },
  imagePreviewText: {
    fontSize: 15,
    color: PharmacyColors.textPrimary,
    marginTop: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  imageActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: PharmacyColors.accent + '15',
  },
  changeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: PharmacyColors.accent,
    marginLeft: 6,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: PharmacyColors.error + '15',
  },
  removeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: PharmacyColors.error,
    marginLeft: 6,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: PharmacyColors.accent + '10',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 20,
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: PharmacyColors.textSecondary,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
});