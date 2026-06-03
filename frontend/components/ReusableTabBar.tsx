import React, { useRef, useEffect } from 'react';
import { Animated, Easing, Platform, Pressable, View, StyleSheet } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useColorScheme } from '@/hooks/use-color-scheme';

const DEFAULT_ACCENT = '#0F766E';

export type TabDef = { name: string; label: string; icon: string; iconActive: string; isCart?: boolean };

function TabItem({ tab, isFocused, isDark, onPress }: { tab: TabDef; isFocused: boolean; isDark: boolean; onPress: () => void; }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const labelOpacity = useRef(new Animated.Value(isFocused ? 1 : 0.5)).current;
  const indicatorWidth = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    if (isFocused) {
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -6, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(bounceAnim, { toValue: 0, speed: 20, bounciness: 14, useNativeDriver: true }),
      ]).start();
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.12, duration: 120, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, speed: 18, bounciness: 8, useNativeDriver: true }),
      ]).start();
      Animated.timing(labelOpacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      Animated.spring(indicatorWidth, { toValue: 1, speed: 14, bounciness: 6, useNativeDriver: true }).start();
    } else {
      Animated.timing(labelOpacity, { toValue: 0.45, duration: 180, useNativeDriver: true }).start();
      Animated.timing(indicatorWidth, { toValue: 0, duration: 160, useNativeDriver: true }).start();
    }
  }, [bounceAnim, indicatorWidth, isFocused, labelOpacity, scaleAnim]);

  function onPressIn() { Animated.spring(scaleAnim, { toValue: 0.92, speed: 40, bounciness: 2, useNativeDriver: true }).start(); }
  function onPressOut() { Animated.spring(scaleAnim, { toValue: 1, speed: 20, bounciness: 10, useNativeDriver: true }).start(); }

  const iconColor = isFocused ? DEFAULT_ACCENT : isDark ? '#666' : '#AAAAAA';
  const labelColor = isFocused ? DEFAULT_ACCENT : isDark ? '#666' : '#AAAAAA';

  // Cart pill handled by parent layout if needed; keep simple here
  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} className="flex-1 items-center justify-center pt-1 pb-0.5">
      <Animated.View style={{ transform: [{ scale: scaleAnim }, { translateY: bounceAnim }] }} className="items-center gap-1">
        <Animated.View style={{ transform: [{ scaleX: indicatorWidth }], opacity: indicatorWidth }} className="absolute -top-3 h-[3px] w-8 rounded-full bg-teal-600" />
        <View className="relative items-center justify-center">
          {isFocused && <View style={{ backgroundColor: `${DEFAULT_ACCENT}18` }} className="absolute h-10 w-10 rounded-full" />}
          <Ionicons name={isFocused ? (tab.iconActive as any) : (tab.icon as any)} size={23} color={iconColor} />
        </View>
        <Animated.Text style={{ opacity: labelOpacity, color: labelColor }} className="text-[10.5px] font-bold tracking-wide">{tab.label}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

export default function ReusableTabBar({ state, navigation, tabs }: BottomTabBarProps & { tabs: TabDef[] }) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const slideAnim = useRef(new Animated.Value(80)).current;
  useEffect(() => { Animated.spring(slideAnim, { toValue: 0, speed: 14, bounciness: 8, useNativeDriver: true }).start(); }, [slideAnim]);

  return (
    <Animated.View style={{ transform: [{ translateY: slideAnim }], paddingBottom: insets.bottom || 12, overflow: 'hidden' }}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={72} tint={isDark ? 'dark' : 'light'} style={{ ...StyleSheet.absoluteFillObject }} />
      ) : (
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: isDark ? '#0C0C0C' : '#FFFFFF', opacity: 0.97 }} />
      )}

      <View style={{ height: 1 }} className={isDark ? 'bg-neutral-800' : 'bg-slate-200'} />

      <View className="flex-row items-center px-2 pt-2 pb-1" style={{ minHeight: 58 }}>
        {state.routes.map((route, index) => {
          const tab = tabs[index] || { name: route.name, label: route.name, icon: 'ellipse', iconActive: 'ellipse' };
          const isFocused = state.index === index;
          return (
            <TabItem key={route.key} tab={tab} isFocused={isFocused} isDark={isDark} onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
            }} />
          );
        })}
      </View>
    </Animated.View>
  );
}
