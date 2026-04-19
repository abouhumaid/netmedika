import { Tabs } from 'expo-router';
import React, { useRef, useEffect } from 'react';
import { Animated, Easing, Platform, Pressable, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useColorScheme } from '@/hooks/use-color-scheme';

const ACCENT = '#0F766E';

const TABS = [
  { name: 'index',   label: 'Home',    icon: 'home-outline'    as const, iconActive: 'home'            as const },
  { name: 'order',   label: 'Orders',  icon: 'receipt-outline' as const, iconActive: 'receipt'         as const },
  { name: 'cart',    label: 'Cart',    icon: 'bag-outline'     as const, iconActive: 'bag'             as const },
  { name: 'profile', label: 'Profile', icon: 'person-outline'  as const, iconActive: 'person'          as const },
] as const;

// ── Animated tab item ────────────────────────────────────────────────────────
function TabItem({
  tab,
  isFocused,
  isCart,
  isDark,
  onPress,
}: {
  tab: typeof TABS[number];
  isFocused: boolean;
  isCart: boolean;
  isDark: boolean;
  onPress: () => void;
}) {
  // Scale spring on focus change
  const scaleAnim = useRef(new Animated.Value(1)).current;
  // Vertical bounce when becoming active
  const bounceAnim = useRef(new Animated.Value(0)).current;
  // Fade for the label
  const labelOpacity = useRef(new Animated.Value(isFocused ? 1 : 0.5)).current;
  // Active indicator width expand
  const indicatorWidth = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    if (isFocused) {
      // Bounce up
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -6, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true,
        }),
        Animated.spring(bounceAnim, {
          toValue: 0, speed: 20, bounciness: 14, useNativeDriver: true,
        }),
      ]).start();

      // Scale pop
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.18, duration: 120, useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1, speed: 18, bounciness: 8, useNativeDriver: true,
        }),
      ]).start();

      // Label fade in
      Animated.timing(labelOpacity, {
        toValue: 1, duration: 180, useNativeDriver: true,
      }).start();

      // Indicator grow
      Animated.spring(indicatorWidth, {
        toValue: 1, speed: 14, bounciness: 6, useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(labelOpacity, {
        toValue: 0.45, duration: 180, useNativeDriver: true,
      }).start();

      Animated.timing(indicatorWidth, {
        toValue: 0, duration: 160, useNativeDriver: true,
      }).start();
    }
  }, [isFocused]);

  function onPressIn() {
    Animated.spring(scaleAnim, {
      toValue: 0.86, speed: 40, bounciness: 2, useNativeDriver: true,
    }).start();
  }

  function onPressOut() {
    Animated.spring(scaleAnim, {
      toValue: 1, speed: 20, bounciness: 10, useNativeDriver: true,
    }).start();
  }

  const iconColor  = isFocused ? ACCENT : isDark ? '#666' : '#AAAAAA';
  const labelColor = isFocused ? ACCENT : isDark ? '#666' : '#AAAAAA';

  // ── Cart: pill CTA ──────────────────────────────────────────────────────
  if (isCart) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        className="flex-1 items-center justify-center"
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }, { translateY: bounceAnim }] }}>
          <View
            style={{
              backgroundColor: isFocused ? ACCENT : '#1E293B',
              shadowColor: isFocused ? ACCENT : '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: isFocused ? 0.45 : 0.2,
              shadowRadius: 10,
              elevation: 8,
            }}
            className="flex-row items-center gap-1.5 rounded-full px-5 py-3"
          >
            <Ionicons
              name={isFocused ? tab.iconActive : tab.icon}
              size={18}
              color="#fff"
            />
            <Text className="text-[13px] font-black text-white tracking-wide">
              {tab.label}
            </Text>
          </View>
        </Animated.View>
      </Pressable>
    );
  }

  // ── Regular tab ─────────────────────────────────────────────────────────
  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      className="flex-1 items-center justify-center pt-1 pb-0.5"
    >
      <Animated.View
        style={{ transform: [{ scale: scaleAnim }, { translateY: bounceAnim }] }}
        className="items-center gap-1"
      >
        {/* Top indicator bar */}
        <Animated.View
          style={{
            transform: [{ scaleX: indicatorWidth }],
            opacity: indicatorWidth,
          }}
          className="absolute -top-3 h-[3px] w-8 rounded-full bg-teal-600"
        />

        {/* Icon with active halo */}
        <View className="relative items-center justify-center">
          {isFocused && (
            <View
              style={{ backgroundColor: `${ACCENT}18` }}
              className="absolute h-10 w-10 rounded-full"
            />
          )}
          <Ionicons
            name={isFocused ? tab.iconActive : tab.icon}
            size={23}
            color={iconColor}
          />
        </View>

        {/* Label */}
        <Animated.Text
          style={{ opacity: labelOpacity, color: labelColor }}
          className="text-[10.5px] font-bold tracking-wide"
        >
          {tab.label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

// ── Tab bar ──────────────────────────────────────────────────────────────────
function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  // Slide up on mount
  const slideAnim = useRef(new Animated.Value(80)).current;
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0, speed: 14, bounciness: 8, useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
        paddingBottom: insets.bottom || 12,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        overflow: 'hidden',
      }}
    >
      {/* Background */}
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={72}
          tint={isDark ? 'dark' : 'light'}
          style={{ ...StyleSheet.absoluteFillObject }}
        />
      ) : (
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: isDark ? '#0C0C0C' : '#FFFFFF',
            opacity: 0.97,
          }}
        />
      )}

      {/* Top border with teal accent gradient illusion */}
      <View
        style={{ height: 1 }}
        className={isDark ? 'bg-neutral-800' : 'bg-slate-200'}
      />

      {/* Tab row */}
      <View className="flex-row items-center px-2 pt-2 pb-1" style={{ minHeight: 58 }}>
        {state.routes.map((route, index) => {
          const tab       = TABS[index];
          const isFocused = state.index === index;
          const isCart    = tab.name === 'cart';

          return (
            <TabItem
              key={route.key}
              tab={tab}
              isFocused={isFocused}
              isCart={isCart}
              isDark={isDark}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
            />
          );
        })}
      </View>
    </Animated.View>
  );
}

// Need StyleSheet for absoluteFillObject
import { StyleSheet } from 'react-native';

// ── Layout ───────────────────────────────────────────────────────────────────
export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index"   options={{ title: 'Home'    }} />
      <Tabs.Screen name="orders"   options={{ title: 'Orders'  }} />
      <Tabs.Screen name="cart"    options={{ title: 'Cart'    }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}