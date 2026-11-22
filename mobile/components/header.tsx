import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type HeaderProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showAvatar?: boolean;
  avatarLabel?: string;
  compact?: boolean;
  badge?: number;
  showNotifications?: boolean;
  notificationCount?: number;
};

export default function Header({
  title,
  subtitle,
  showBack = false,
  showAvatar = false,
  avatarLabel = 'N',
  compact = false,
  badge,
  showNotifications = false,
  notificationCount = 0,
}: HeaderProps) {
  return (
    <LinearGradient
      colors={['#0F766E', '#0D9488', '#14B8A6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, compact && styles.compact]}
    >
      <View style={styles.row}>
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </Pressable>
        ) : (
          <View style={styles.brandMark}>
            <Ionicons name="medical" size={19} color="#FFFFFF" />
          </View>
        )}

        <View style={styles.titleGroup}>
          <Text numberOfLines={1} style={styles.title}>{title}</Text>
          {subtitle ? <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        {showNotifications ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={notificationCount > 0 ? `Notifications, ${notificationCount} unread` : 'Notifications'}
            onPress={() => router.push('/admin/notifications')}
            style={styles.notificationButton}
          >
            <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            {notificationCount > 0 ? (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}

        {showAvatar ? (
          <View style={styles.avatar}>
            <Text style={styles.avatarLabel}>{avatarLabel.charAt(0).toUpperCase()}</Text>
            {badge != null && badge > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
      <View style={styles.divider} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 7,
    paddingBottom: 2,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    shadowColor: '#064E48',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 5,
  },
  compact: {
    paddingTop: 3,
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  titleGroup: { flex: 1, justifyContent: 'center' },
  title: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  subtitle: { color: 'rgba(255,255,255,0.78)', fontSize: 10, marginTop: 2 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  avatarLabel: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  notificationButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  notificationBadge: {
    position: 'absolute',
    top: -3,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E24B5B',
    borderWidth: 2,
    borderColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  notificationBadgeText: { color: '#FFFFFF', fontSize: 7, lineHeight: 9, fontWeight: '800' },
  badge: {
    position: 'absolute',
    top: -3,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E24B5B',
    borderWidth: 2,
    borderColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: { color: '#FFFFFF', fontSize: 7, lineHeight: 9, fontWeight: '800' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.24)', marginTop: 7 },
});
