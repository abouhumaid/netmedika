import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

type BackArrowButtonProps = {
  onPress?: () => void;
};

type FloatingFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  errorMessage?: string;
  autoCapitalize?: TextInputProps['autoCapitalize'];
};

type AuthSubmitButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export function BackArrowButton({ onPress }: BackArrowButtonProps) {
  const pressAnimation = useRef(new Animated.Value(0)).current;

  const animatedStyle = {
    transform: [
      {
        scale: pressAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.94],
        }),
      },
      {
        translateX: pressAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -3],
        }),
      },
    ],
  };

  const animateTo = (toValue: number) => {
    Animated.spring(pressAnimation, {
      toValue,
      useNativeDriver: true,
      friction: 8,
      tension: 140,
    }).start();
  };

  return (
    <Pressable
      onPressIn={() => animateTo(1)}
      onPressOut={() => animateTo(0)}
      onPress={onPress ?? (() => router.back())}
      hitSlop={10}>
      <Animated.View
        style={animatedStyle}
        className="h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm shadow-slate-950/10">
        <Text className="text-[22px] font-bold text-pharmacy-600">←</Text>
      </Animated.View>
    </Pressable>
  );
}

export function FloatingField({
  label,
  value,
  onChangeText,
  onBlur,
  secureTextEntry,
  keyboardType = 'default',
  errorMessage,
  autoCapitalize = 'none',
}: FloatingFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const animated = useRef(new Animated.Value(value ? 1 : 0)).current;
  const active = isFocused || value.length > 0;
  const shouldMaskText = !!secureTextEntry && !isPasswordVisible;

  useEffect(() => {
    Animated.timing(animated, {
      toValue: active ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [active, animated]);

  const labelStyle = useMemo(
    () => ({
      top: animated.interpolate({
        inputRange: [0, 1],
        outputRange: [18, 8],
      }),
      fontSize: animated.interpolate({
        inputRange: [0, 1],
        outputRange: [16, 12],
      }),
      color: errorMessage ? '#DC2626' : active ? '#0F766E' : '#64748B',
    }),
    [active, animated, errorMessage]
  );

  return (
    <View>
      <View
        className={`relative min-h-[64px] justify-center rounded-[18px] border bg-[#FCFFFE] px-4 pt-[14px] ${
          errorMessage
            ? 'border-red-400'
            : active
              ? 'border-pharmacy-600'
              : 'border-[#CFE9E4]'
        }`}>
        <Animated.Text style={[floatingLabelStyle, labelStyle]}>{label}</Animated.Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          className={`pb-1.5 pt-2 text-base text-slateink ${secureTextEntry ? 'pr-16' : ''}`}
          selectionColor="#0F766E"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={shouldMaskText}
        />
        {secureTextEntry ? (
          <Pressable
            className="absolute right-4 z-10"
            style={{ top: 22 }}
            hitSlop={10}
            onPress={() => setIsPasswordVisible((current) => !current)}>
            <Text className="text-sm font-bold text-pharmacy-600">
              {isPasswordVisible ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {errorMessage ? (
        <Text className="mt-1.5 px-1 text-sm leading-5 text-red-500">{errorMessage}</Text>
      ) : null}
    </View>
  );
}

export function AuthSubmitButton({ label, onPress, disabled }: AuthSubmitButtonProps) {
  return (
    <Pressable
      className={`items-center rounded-[18px] py-3.5 ${disabled ? 'bg-[#94D3CC]' : 'bg-pharmacy-600 active:bg-pharmacy-700'}`}
      onPress={onPress}
      disabled={disabled}>
      <Text className={`text-base font-bold ${disabled ? 'text-white/90' : 'text-white'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

const floatingLabelStyle = {
  position: 'absolute' as const,
  left: 16,
  fontWeight: '600' as const,
};
