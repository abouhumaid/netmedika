import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

export default function Header({
  title,
  subtitle,
  showBack,
  showAvatar,
  avatarLabel = 'N',
  compact,
  badge,
}: {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showAvatar?: boolean;
  avatarLabel?: string;
  compact?: boolean;
  badge?: number;
}) {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-10)).current;
  const avatarScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleAvatarPress = () => {
    Animated.sequence([
      Animated.spring(avatarScale, { toValue: 0.85, useNativeDriver: true, tension: 200 }),
      Animated.spring(avatarScale, { toValue: 1,    useNativeDriver: true, tension: 200 }),
    ]).start();
  };

  return (
    <LinearGradient
      colors={['#0D9488', '#0F766E', '#0C5F58']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className={`w-full overflow-hidden px-5 pb-5 ${compact ? 'pt-10' : 'pt-14'}`}
      style={{
        shadowColor: '#0F766E',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 12,
      }}
    >
      {/* Decorative orbs — absolute positioning still needs style prop in RN */}
      <View
        className="absolute rounded-full bg-white/[0.07]"
        style={{ width: 160, height: 160, top: -40, right: -30 }}
      />
      <View
        className="absolute rounded-full bg-white/[0.05]"
        style={{ width: 80, height: 80, bottom: -20, left: 30 }}
      />

      {/* Animated content */}
      <Animated.View
        className="flex-row items-center justify-between gap-3"
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        {/* Left: Back + Title */}
        <View className="flex-1 flex-row items-center gap-3">
          {showBack && (
            <Pressable
              onPress={() => router.back()}
              className="overflow-hidden rounded-xl active:opacity-70"
            >
              <BlurView
                intensity={20}
                tint="light"
                className="items-center justify-center rounded-xl border border-white/20 p-2.5"
              >
                <Ionicons name="chevron-back" size={20} color="white" />
              </BlurView>
            </Pressable>
          )}

          <View className="flex-1">
            {subtitle && (
              <Text className="mb-0.5 text-[9px] font-bold tracking-[2px] text-white/60">
                {subtitle.toUpperCase()}
              </Text>
            )}
            <Text
              className="text-[22px] font-black -tracking-[0.5px] text-white"
              numberOfLines={1}
            >
              {title}
            </Text>
            {/* Accent underline */}
            <View className="mt-1.5 h-[3px] w-7 rounded-full bg-white/40" />
          </View>
        </View>

        {/* Right: Avatar */}
        {showAvatar && (
          <Pressable onPress={handleAvatarPress}>
            <Animated.View
              className="relative"
              style={{ transform: [{ scale: avatarScale }] }}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.1)']}
                className="h-[42px] w-[42px] items-center justify-center rounded-[14px] border border-white/35"
              >
                <Text className="text-base font-black tracking-wide text-white">
                  {avatarLabel}
                </Text>
              </LinearGradient>

              {/* Online dot */}
              <View
                className="absolute -bottom-0.5 -right-0.5 h-[11px] w-[11px] rounded-full border-2 border-teal-700 bg-emerald-400"
              />

              {/* Badge */}
              {badge != null && badge > 0 && (
                <View className="absolute -right-1.5 -top-1.5 min-w-[18px] items-center justify-center rounded-full border-2 border-teal-700 bg-rose-500 px-1 py-px">
                  <Text className="text-[9px] font-black text-white">
                    {badge > 9 ? '9+' : badge}
                  </Text>
                </View>
              )}
            </Animated.View>
          </Pressable>
        )}
      </Animated.View>

      {/* Bottom shimmer line */}
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.25)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="absolute bottom-0 left-0 right-0 h-px"
      />
    </LinearGradient>
  );
}