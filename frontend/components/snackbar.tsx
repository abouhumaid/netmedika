import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SnackbarProps = {
  visible: boolean;
  message: string;
  tone?: 'success' | 'error';
  bottomOffset?: number;
  onHide: () => void;
};

export function Snackbar({
  visible,
  message,
  tone = 'success',
  bottomOffset = 0,
  onHide,
}: SnackbarProps) {
  const translateY = useRef(new Animated.Value(120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible || !message) {
      return;
    }

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 9,
        tension: 120,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 120,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => onHide());
    }, 2600);

    return () => clearTimeout(timer);
  }, [message, onHide, opacity, translateY, visible]);

  if (!visible || !message) {
    return null;
  }

  const palette =
    tone === 'error'
      ? {
          container: 'bg-[#7F1D1D]',
          accent: 'bg-[#FCA5A5]',
        }
      : {
          container: 'bg-[#0F766E]',
          accent: 'bg-[#99F6E4]',
        };

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
        bottom: Math.max(insets.bottom, 12) + 12 + bottomOffset,
      }}
      className="absolute left-4 right-4 z-50">
      <View className={`overflow-hidden rounded-[24px] ${palette.container} px-4 py-4 shadow-lg shadow-slate-950/20`}>
        <View className={`mb-3 h-1.5 w-14 rounded-full ${palette.accent}`} />
        <Text className="text-sm font-semibold leading-6 text-white">{message}</Text>
      </View>
    </Animated.View>
  );
}
