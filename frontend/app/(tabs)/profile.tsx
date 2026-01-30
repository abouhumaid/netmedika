import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PharmacyColors, CommonStyles } from '../../constants/Colors';

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);



  const menuItems = [
    {
      id: 3,
      title: 'Delivery Address',
      icon: 'location-outline',
      color: PharmacyColors.warning,
      onPress: () => router.push('/addresses/'),
    },
    {
      id: 6,
      title: 'Help & Support',
      icon: 'help-circle-outline',
      color: PharmacyColors.accent,
      onPress: () => console.log('Support'),
    },
    {
      id: 7,
      title: 'Settings',
      icon: 'settings-outline',
      color: PharmacyColors.gray,
      onPress: () => router.push('/settings/'),
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PharmacyColors.primary} />
      
      {/* Header with User Info */}
      <LinearGradient
        colors={PharmacyColors.gradientPrimary}
        style={styles.header}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={PharmacyColors.gradientAccent}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </LinearGradient>
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'email@example.com'}</Text>
          </View>

          <TouchableOpacity style={styles.editButton}>
            <Ionicons name="create-outline" size={20} color={PharmacyColors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
              </View>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={20} color={PharmacyColors.gray} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          // onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={24} color={PharmacyColors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>
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
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: PharmacyColors.white,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: PharmacyColors.white,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: PharmacyColors.white,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: PharmacyColors.white,
    opacity: 0.9,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statCardMiddle: {
    marginHorizontal: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: PharmacyColors.white,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: PharmacyColors.white,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  menuContainer: {
    backgroundColor: PharmacyColors.white,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 8,
    ...CommonStyles.shadow,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: PharmacyColors.textPrimary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PharmacyColors.white,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PharmacyColors.error,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PharmacyColors.error,
    marginLeft: 8,
  },
  versionText: {
    textAlign: 'center',
    color: PharmacyColors.gray,
    fontSize: 12,
    marginBottom: 30,
  },
});