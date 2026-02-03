import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar, 
  Alert,
  Animated,
  Dimensions 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PharmacyColors, CommonStyles } from '../../constants/Colors';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Animations
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const avatarRotate = useRef(new Animated.Value(0)).current;
  const menuFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(avatarRotate, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(menuFade, {
        toValue: 1,
        duration: 800,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleEditProfile = () => {
    // Pulse animation on edit button press
    Animated.sequence([
      Animated.spring(cardScale, {
        toValue: 0.98,
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

    Alert.alert('Edit Profile', 'Profile editing coming soon!');
  };

  const avatarRotation = avatarRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const menuItems = [
    {
      id: 3,
      title: 'Delivery Address',
      icon: 'location-outline',
      color: PharmacyColors.warning || '#FF9800',
      onPress: () => Alert.alert('Coming Soon', 'This Option will be available soon'),
    },
    {
      id: 4,
      title: 'Payment Methods',
      icon: 'card-outline',
      color: '#9C27B0',
      onPress: () => Alert.alert('Coming Soon', 'Payment methods will be available soon'),
    },
    {
      id: 5,
      title: 'Help & Support',
      icon: 'help-circle-outline',
      color: '#2196F3',
      onPress: () => Alert.alert('Help & Support', 'Contact us at support@pharmacy.com'),
    },
    {
      id: 6,
      title: 'Settings',
      icon: 'settings-outline',
      color: PharmacyColors.gray,
      onPress: () => Alert.alert('Coming Soon', 'This option will be available soon'),
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PharmacyColors.primary} />
      

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Animated Profile Card */}
        <Animated.View
          style={[
            styles.profileCard,
            {
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            },
          ]}
        >
          <LinearGradient
            colors={['#FFFFFF', '#F8F9FA']}
            style={styles.profileCardGradient}
          >
            {/* Avatar Section */}
            <View style={styles.avatarSection}>
              <Animated.View
                style={[
                  styles.avatarContainer,
                  { transform: [{ rotate: avatarRotation }] },
                ]}
              >
                <LinearGradient
                  colors={PharmacyColors.gradientAccent}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarText}>
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </LinearGradient>
                
                {/* Online Status Indicator */}
                <View style={styles.onlineIndicator}>
                  <View style={styles.onlineDot} />
                </View>
              </Animated.View>

              {/* Edit Button */}
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEditProfile}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={PharmacyColors.gradientAccent}
                  style={styles.editButtonGradient}
                >
                  <Ionicons name="create-outline" size={18} color={PharmacyColors.white} />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* User Info */}
            <View style={styles.userInfoSection}>
              <Text style={styles.userName}>{user?.name || 'Mk Ismail'}</Text>
              <View style={styles.emailContainer}>
                <Ionicons name="mail-outline" size={14} color={PharmacyColors.textSecondary} />
                <Text style={styles.userEmail}>{user?.email || 'ismailmk@email.com'}</Text>
              </View>
              <View style={styles.phoneContainer}>
                <Ionicons name="call-outline" size={14} color={PharmacyColors.textSecondary} />
                <Text style={styles.userPhone}>{user?.phone || '+234 800 123 4567'}</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Menu Items */}
        <Animated.View style={[styles.menuContainer, { opacity: menuFade }]}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                index === menuItems.length - 1 && styles.menuItemLast,
              ]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={20} color={PharmacyColors.gray} />
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Logout Button */}
        <Animated.View style={{ opacity: menuFade }}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              Alert.alert(
                'Logout',
                'Are you sure you want to logout?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Logout', 
                    style: 'destructive',
                    onPress: () => {
                      // Handle logout
                      router.replace('/login');
                    }
                  },
                ]
              );
            }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF5252', '#F44336']}
              style={styles.logoutButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="log-out-outline" size={22} color={PharmacyColors.white} />
              <Text style={styles.logoutText}>Logout</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

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
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: PharmacyColors.white,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  profileCard: {
    marginHorizontal: 20,
    marginTop: 30,
    borderRadius: 20,
    overflow: 'hidden',
    ...CommonStyles.shadowMedium,
  },
  profileCardGradient: {
    padding: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: PharmacyColors.white,
    ...CommonStyles.shadow,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: PharmacyColors.white,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: PharmacyColors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: PharmacyColors.white,
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  editButton: {
    position: 'absolute',
    top: 0,
    right: width / 2 - 120,
    borderRadius: 18,
    overflow: 'hidden',
    ...CommonStyles.shadow,
  },
  editButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: PharmacyColors.textPrimary,
    marginBottom: 8,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  userEmail: {
    fontSize: 14,
    color: PharmacyColors.textSecondary,
    marginLeft: 6,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userPhone: {
    fontSize: 14,
    color: PharmacyColors.textSecondary,
    marginLeft: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: PharmacyColors.borderGray,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: PharmacyColors.accent,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: PharmacyColors.textSecondary,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: PharmacyColors.borderGray,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: PharmacyColors.textSecondary,
    marginBottom: 12,
    marginLeft: 4,
  },
  menuContainer: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PharmacyColors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    ...CommonStyles.shadow,
  },
  menuItemLast: {
    marginBottom: 0,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: PharmacyColors.textPrimary,
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
    ...CommonStyles.shadow,
  },
  logoutButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PharmacyColors.white,
    marginLeft: 8,
  },
  versionText: {
    textAlign: 'center',
    color: PharmacyColors.gray,
    fontSize: 12,
    marginTop: 24,
  },
});