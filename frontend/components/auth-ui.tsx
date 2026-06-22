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
import { Ionicons } from '@expo/vector-icons';

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
  compact?: boolean;
};

type AuthSubmitButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  compact?: boolean;
};

type SocialAuthButtonProps = {
  provider: 'google' | 'apple';
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
  compact,
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
        outputRange: compact ? [15, 6] : [18, 8],
      }),
      fontSize: animated.interpolate({
        inputRange: [0, 1],
        outputRange: compact ? [15, 11] : [16, 12],
      }),
      color: errorMessage ? '#DC2626' : active ? '#0F766E' : '#64748B',
    }),
    [active, animated, compact, errorMessage]
  );

  return (
    <View>
      <View
        className={`relative justify-center rounded-[16px] border bg-[#FCFFFE] px-4 ${
          compact ? 'min-h-[56px] pt-[10px]' : 'min-h-[64px] pt-[14px]'
        } ${
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
          className={`${compact ? 'pb-1 pt-2 text-[15px]' : 'pb-1.5 pt-2 text-base'} text-slateink ${secureTextEntry ? 'pr-16' : ''}`}
          selectionColor="#0F766E"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={shouldMaskText}
        />
        {secureTextEntry ? (
          <Pressable
            className="absolute right-4 z-10"
            style={{ top: compact ? 18 : 22 }}
            hitSlop={10}
            onPress={() => setIsPasswordVisible((current) => !current)}>
            <Text className="text-sm font-bold text-pharmacy-600">
              {isPasswordVisible ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {errorMessage ? (
        <Text className={`${compact ? 'mt-1 px-1 text-[12px] leading-4' : 'mt-1.5 px-1 text-sm leading-5'} text-red-500`}>{errorMessage}</Text>
      ) : null}
    </View>
  );
}

export function AuthSubmitButton({ label, onPress, disabled, compact }: AuthSubmitButtonProps) {
  return (
    <Pressable
      className={`items-center rounded-[16px] ${compact ? 'py-3' : 'py-3.5'} ${disabled ? 'bg-[#94D3CC]' : 'bg-pharmacy-600 active:bg-pharmacy-700'}`}
      onPress={onPress}
      disabled={disabled}>
      <Text className={`${compact ? 'text-[15px]' : 'text-base'} font-bold ${disabled ? 'text-white/90' : 'text-white'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export function AuthDivider() {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-px flex-1 bg-slate-200" />
      <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-slate-400">
        or continue with
      </Text>
      <View className="h-px flex-1 bg-slate-200" />
    </View>
  );
}

export function SocialAuthButton({ provider, label, onPress, disabled }: SocialAuthButtonProps) {
  const isApple = provider === 'apple';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`h-11 flex-1 flex-row items-center justify-center gap-2 rounded-[14px] border border-slate-200 bg-white active:bg-slate-50 ${
        disabled ? 'opacity-60' : ''
      }`}>
      {isApple ? (
        <>
          <Ionicons name="logo-apple" size={18} color="#0F172A" />
          <Text className="text-[13px] font-bold text-slate-700">{label}</Text>
        </>
      ) : (
        <GoogleWordmark label={label} />
      )}
    </Pressable>
  );
}

function GoogleWordmark({ label }: { label: string }) {
  if (label !== 'Google') {
    return <Text className="text-[13px] font-bold text-slate-700">{label}</Text>;
  }

  return (
    <View className="flex-row items-center">
      <Text className="text-[14px] font-black text-[#4285F4]">G</Text>
      <Text className="text-[14px] font-black text-[#EA4335]">o</Text>
      <Text className="text-[14px] font-black text-[#FBBC05]">o</Text>
      <Text className="text-[14px] font-black text-[#4285F4]">g</Text>
      <Text className="text-[14px] font-black text-[#34A853]">l</Text>
      <Text className="text-[14px] font-black text-[#EA4335]">e</Text>
    </View>
  );
}

const floatingLabelStyle = {
  position: 'absolute' as const,
  left: 16,
  fontWeight: '600' as const,
};
