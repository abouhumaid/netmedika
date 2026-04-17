import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type FloatingFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
};

function FloatingField({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = 'default',
}: FloatingFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const animated = useRef(new Animated.Value(value ? 1 : 0)).current;
  const active = isFocused || value.length > 0;

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
      color: active ? '#0F766E' : '#64748B',
    }),
    [active, animated]
  );

  return (
    <View
      className={`relative min-h-[72px] justify-center rounded-[18px] border bg-[#FCFFFE] px-4 pt-[18px] ${
        active ? 'border-pharmacy-600' : 'border-[#CFE9E4]'
      }`}>
      <Animated.Text style={[styles.floatingLabel, labelStyle]}>{label}</Animated.Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="pb-2 pt-3 text-base text-slateink"
        selectionColor="#0F766E"
        keyboardType={keyboardType}
        autoCapitalize="none"
        secureTextEntry={secureTextEntry}
      />
    </View>
  );
}

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView className="flex-1 bg-[#F4FFFC]">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="mx-auto flex-1 w-full max-w-[560px] px-4 pb-7 pt-2.5 sm:px-5">
          <View className="flex-row items-center justify-between">
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Text className="text-[15px] font-bold text-pharmacy-600">Back</Text>
            </Pressable>
            <Text className="overflow-hidden rounded-full bg-pharmacy-100 px-3 py-2 text-[12px] font-bold uppercase tracking-[0.4px] text-pharmacy-600">
              New account
            </Text>
          </View>

          <View className="mt-8 items-center gap-2">
            <Text className="text-[15px] font-semibold uppercase tracking-[3px] text-pharmacy-600">
              Join
            </Text>
            <Text className="text-center text-[36px] font-black tracking-[2px] text-slateink sm:text-[42px]">
              <Text className="text-pharmacy-600">Net</Text>
              <Text className="text-emerald-500">medika</Text>
            </Text>
            <Text className="max-w-[320px] text-center text-base leading-6 text-slate-500">
              Create your pharmacy account to place orders, manage prescriptions, and track delivery.
            </Text>
          </View>

          <View className="mt-6 gap-4 rounded-[28px] bg-white p-5 shadow-sm shadow-slate-950/10 sm:p-6">
            <FloatingField label="Full name" value={fullName} onChangeText={setFullName} />
            <FloatingField
              label="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <FloatingField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Pressable className="items-center rounded-[18px] bg-pharmacy-600 py-[17px] active:bg-pharmacy-700">
              <Text className="text-base font-bold text-white">Create Account</Text>
            </Pressable>
          </View>

          <Text className="mt-5 text-center text-sm leading-[21px] text-slate-500">
            Already registered?{' '}
            <Text className="font-bold text-pharmacy-600" onPress={() => router.push('/login')}>
              Login here
            </Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  floatingLabel: {
    position: 'absolute',
    left: 16,
    fontWeight: '600',
  },
});
