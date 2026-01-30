import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { PharmacyColors, CommonStyles } from '../../constants/Colors';
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';

export default function HomeScreen() {
  const [userName, setUserName] = useState('User');


  const handleOrderDrugs = () => {
    router.push('/(tabs)/medicines');
  };

  const handleLabTest = () => {
    // Navigate to lab test booking screen
    Toast.show({
      type: 'info',
      text1: 'Coming Soon',
      text2: 'Lab test booking will be available soon',
      position: 'top',
      visibilityTime: 3000,
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PharmacyColors.primary} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.servicesContainer}>
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
                  <Ionicons name="medical" size={32} color={PharmacyColors.white} />
                </LinearGradient>
              </View>
              <Text style={styles.serviceTitle}>Order Medicines</Text>
              <Text style={styles.serviceDescription}>
                Order prescribed medicines and get them delivered to your doorstep
              </Text>
              <View style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Order Now</Text>
                <Ionicons name="arrow-forward" size={20} color={PharmacyColors.accent} />
              </View>
            </LinearGradient>
          </TouchableOpacity>

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
                  <MaterialIcons name="science" size={32} color={PharmacyColors.white} />
                </LinearGradient>
              </View>
              <Text style={styles.serviceTitle}>Book Lab Test</Text>
              <Text style={styles.serviceDescription}>
                Book diagnostic tests and health checkups at home
              </Text>
              <View style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Book Now</Text>
                <Ionicons name="arrow-forward" size={20} color="#8E24AA" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  servicesContainer: {
    padding: 20,
  },
  serviceCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    ...CommonStyles.shadowMedium,
  },
  serviceCardGradient: {
    padding: 24,
  },
  serviceIconContainer: {
    marginBottom: 16,
  },
  serviceIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: PharmacyColors.textPrimary,
    marginBottom: 8,
  },
  serviceDescription: {
    fontSize: 14,
    color: PharmacyColors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PharmacyColors.white,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    ...CommonStyles.shadow,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
});