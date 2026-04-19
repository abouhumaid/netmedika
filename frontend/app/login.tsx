import { zodResolver } from '@hookform/resolvers/zod';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { AuthSubmitButton, BackArrowButton, FloatingField } from '@/components/auth-ui';
import { Snackbar } from '@/components/snackbar';
import { loginUser } from '@/lib/auth-api';
import { saveAuthSession } from '@/lib/auth-session';
import { consumePendingFlashToast } from '@/lib/flash-toast';

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarTone, setSnackbarTone] = useState<'success' | 'error'>('success');

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  useEffect(() => {
    const pendingToast = consumePendingFlashToast();

    if (pendingToast) {
      setSnackbarMessage(pendingToast.message);
      setSnackbarTone(pendingToast.tone);
    }
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const response = await loginUser(values);
      await saveAuthSession({
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
      });
      router.replace('/(tabs)');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to sign in right now. Try again.';
      setSnackbarMessage(message);
      setSnackbarTone('error');
    }
  });

  return (
    <SafeAreaView className="flex-1 bg-[#F4FFFC]">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="mx-auto flex-1 w-full max-w-[560px] px-4 pb-7 pt-2.5 sm:px-5">
          <View className="flex-row items-center justify-between">
            <BackArrowButton />
            <Text className="overflow-hidden rounded-full bg-pharmacy-100 px-3 py-2 text-[12px] font-bold uppercase tracking-[0.4px] text-pharmacy-600">
              Secure sign in
            </Text>
          </View>

          <View className="mt-8 items-center gap-2">
            <Text className="text-[15px] font-semibold uppercase tracking-[3px] text-pharmacy-600">
              Sign in
            </Text>
            <Text className="text-center text-[36px] font-black tracking-[2px] text-slateink sm:text-[42px]">
              <Text className="text-pharmacy-600">Net</Text>
              <Text className="text-emerald-500">medika</Text>
            </Text>
          </View>

          <View className="mt-6 gap-4 rounded-[28px] bg-white p-5 shadow-sm shadow-slate-950/10 sm:p-6">
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <FloatingField
                  label="Email address"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="email-address"
                  errorMessage={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <FloatingField
                  label="Password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  errorMessage={errors.password?.message}
                />
              )}
            />

            <Pressable className="self-end">
              <Text className="text-sm font-semibold text-pharmacy-600">Forgot password?</Text>
            </Pressable>

            <AuthSubmitButton
              label={isSubmitting ? 'Logging In...' : 'Log In'}
              onPress={onSubmit}
              disabled={isSubmitting}
            />
          </View>

          <Text className="mt-5 text-center leading-[21px] text-slate-500">
            New account?{' '}
            <Text className="font-bold text-pharmacy-600" onPress={() => router.push('/register')}>
              Register here
            </Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
      <Snackbar
        visible={!!snackbarMessage}
        message={snackbarMessage}
        tone={snackbarTone}
        onHide={() => setSnackbarMessage('')}
      />
    </SafeAreaView>
  );
}
