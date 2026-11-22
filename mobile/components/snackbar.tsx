import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const translateY = useRef(new Animated.Value(-120)).current;
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
        toValue: -120,
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
          container: '#FFF1F2',
          border: '#FECDD3',
          icon: '#E11D48',
          iconName: 'alert-circle' as const,
        }
      : {
          container: '#ECFDF5',
          border: '#A7F3D0',
          icon: '#0F766E',
          iconName: 'checkmark-circle' as const,
        };

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
        top: Math.max(insets.top, 12) + 8,
      }}
      className="absolute left-4 right-4 z-50"
    >
      <View style={{ backgroundColor: palette.container, borderColor: palette.border }} className="flex-row items-center rounded-2xl border px-4 py-3 shadow-lg shadow-slate-950/15">
        <Ionicons name={palette.iconName} size={23} color={palette.icon} />
        <Text className="ml-3 flex-1 text-[13px] font-semibold leading-5 text-slate-800">{message}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss alert" onPress={onHide} hitSlop={10} className="ml-2 p-1">
          <Ionicons name="close" size={18} color="#64748B" />
        </Pressable>
      </View>
    </Animated.View>
  );
}
