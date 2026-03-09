import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { PharmacyColors, CommonStyles } from '../../constants/Colors';
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [userName, setUserName] = useState('User');

  const handleOrderDrugs = () => {
    router.push('/medicines');
  };

  const handleLabTest = () => {
    Toast.show({
      type: 'info',
      text1: 'Coming Soon',
      text2: 'Lab test booking will be available soon',
      position: 'top',
      visibilityTime: 3000,
    });
  };

  const handleViewOrders = () => {
    router.push('/cart');
  };

  const handleUploadPrescription = () => {
    router.push('/medicines');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PharmacyColors.primary} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* Main Services Row */}
        <View style={styles.servicesContainer}>
          <View style={styles.servicesRow}>
            {/* Order Medicines Card */}
            <TouchableOpacity style={styles.serviceCard} onPress={handleOrderDrugs}>
              <LinearGradient
                colors={['#E3F2FD', '#BBDEFB']}
                style={styles.serviceCardGradient}
              >
                <View style={styles.serviceIconContainer}>
                  <LinearGradient
                    colors={PharmacyColors.gradientAccent}
                    style={styles.serviceIcon}
                  >
                    <Ionicons name="medical" size={28} color={PharmacyColors.white} />
                  </LinearGradient>
                </View>
                <Text style={styles.serviceTitle}>Order Medicines</Text>
                <View style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>Order</Text>
                  <Ionicons name="arrow-forward" size={16} color={PharmacyColors.accent} />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Book Lab Test Card */}
            <TouchableOpacity style={styles.serviceCard} onPress={handleLabTest}>
              <LinearGradient
                colors={['#F3E5F5', '#E1BEE7']}
                style={styles.serviceCardGradient}
              >
                <View style={styles.serviceIconContainer}>
                  <LinearGradient
                    colors={['#8E24AA', '#6A1B9A']}
                    style={styles.serviceIcon}
                  >
                    <MaterialIcons name="science" size={28} color={PharmacyColors.white} />
                  </LinearGradient>
                </View>
                <Text style={styles.serviceTitle}>Book Lab Test</Text>
                <View style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>Book</Text>
                  <Ionicons name="arrow-forward" size={16} color="#8E24AA" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Banner */}
        <View style={styles.infoBannerContainer}>
          <LinearGradient
            colors={['#4CAF50', '#45a049']}
            style={styles.infoBanner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.infoBannerIcon}>
              <Ionicons name="shield-checkmark" size={32} color={PharmacyColors.white} />
            </View>
            <View style={styles.infoBannerContent}>
              <Text style={styles.infoBannerTitle}>100% Safe & Secure</Text>
              <Text style={styles.infoBannerText}>
                All medicines are genuine and sourced from licensed pharmacies
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Features Section */}
        <View style={styles.featuresContainer}>
          <Text style={styles.sectionTitle}>Why Choose Us</Text>
          
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: PharmacyColors.accent + '15' }]}>
              <Ionicons name="flash" size={20} color={PharmacyColors.accent} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Fast Delivery</Text>
              <Text style={styles.featureDescription}>Get your medicines delivered within 30-45 minutes</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: '#4CAF50' + '15' }]}>
              <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Genuine Products</Text>
              <Text style={styles.featureDescription}>100% authentic medicines from licensed vendors</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: '#FF9800' + '15' }]}>
              <Ionicons name="wallet" size={20} color="#FF9800" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Best Prices</Text>
              <Text style={styles.featureDescription}>Competitive pricing with special discounts</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PharmacyColors.background,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 14,
    color: PharmacyColors.white,
    opacity: 0.9,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: PharmacyColors.white,
    marginTop: 4,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: PharmacyColors.error,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: PharmacyColors.primary,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: PharmacyColors.white,
  },
  servicesContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  servicesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  serviceCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    ...CommonStyles.shadowMedium,
  },
  serviceCardGradient: {
    padding: 16,
    minHeight: 180,
  },
  serviceIconContainer: {
    marginBottom: 12,
  },
  serviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PharmacyColors.textPrimary,
    marginBottom: 12,
    lineHeight: 22,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PharmacyColors.white,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    ...CommonStyles.shadow,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 4,
    color: PharmacyColors.textPrimary,
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PharmacyColors.textPrimary,
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: (width - 52) / 4,
    backgroundColor: PharmacyColors.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
    ...CommonStyles.shadow,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: PharmacyColors.textPrimary,
    textAlign: 'center',
    lineHeight: 14,
  },
  infoBannerContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  infoBanner: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    ...CommonStyles.shadow,
  },
  infoBannerIcon: {
    marginRight: 16,
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PharmacyColors.white,
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 13,
    color: PharmacyColors.white,
    opacity: 0.9,
    lineHeight: 18,
  },
  featuresContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  featureItem: {
    flexDirection: 'row',
    backgroundColor: PharmacyColors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    ...CommonStyles.shadow,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: PharmacyColors.textPrimary,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    color: PharmacyColors.textSecondary,
    lineHeight: 18,
  },
});