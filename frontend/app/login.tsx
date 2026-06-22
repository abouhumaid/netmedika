import { zodResolver } from '@hookform/resolvers/zod';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import {
  AuthDivider,
  AuthSubmitButton,
  BackArrowButton,
  FloatingField,
  SocialAuthButton,
} from '@/components/auth-ui';
import { Snackbar } from '@/components/snackbar';
import { loginUser } from '@/lib/auth-api';
import { saveAuthSession } from '@/lib/auth-session';
import { consumePendingFlashToast } from '@/lib/flash-toast';
import { startSocialAuth } from '@/lib/social-auth';
import type { SocialAuthProvider } from '@/lib/config';

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarTone, setSnackbarTone] = useState<'success' | 'error'>('success');
  const [socialProvider, setSocialProvider] = useState<SocialAuthProvider | null>(null);

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
      // Redirect admins to admin dashboard, regular users to main tabs
      const destination = response.user?.role === 'admin' ? '/admin' : '/(tabs)';
      router.replace(destination as any);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to sign in right now. Try again.';
      setSnackbarMessage(message);
      setSnackbarTone('error');
    }
  });

  const handleSocialAuth = async (provider: SocialAuthProvider) => {
    setSocialProvider(provider);
    try {
      const response = await startSocialAuth(provider);
      await saveAuthSession({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      router.replace(response.role === 'admin' ? '/admin' : '/(tabs)');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to complete social sign-in right now.';
      setSnackbarMessage(message);
      setSnackbarTone('error');
    } finally {
      setSocialProvider(null);
    }
  };

  const isBusy = isSubmitting || !!socialProvider;

  return (
    <SafeAreaView className="flex-1 bg-[#F4FFFC]">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="mx-auto flex-1 w-full max-w-[560px] px-4 pb-5 pt-2.5 sm:px-5">
          <View className="flex-row items-center justify-between">
            <BackArrowButton />
            <Text className="overflow-hidden rounded-full bg-pharmacy-100 px-3 py-2 text-[12px] font-bold uppercase tracking-[0.4px] text-pharmacy-600">
              Secure sign in
            </Text>
          </View>

          <View className="mt-5 items-center gap-1.5">
            <Text className="text-[13px] font-semibold uppercase tracking-[2.5px] text-pharmacy-600">
              Sign in
            </Text>
            <Text className="text-center text-[32px] font-black tracking-[1.5px] text-slateink sm:text-[38px]">
              <Text className="text-pharmacy-600">Net</Text>
              <Text className="text-emerald-500">medika</Text>
            </Text>
          </View>

          <View className="mt-4 gap-3 rounded-[24px] bg-white p-4 shadow-sm shadow-slate-950/10 sm:p-5">
            <View className="flex-row gap-3">
              <SocialAuthButton
                provider="google"
                label={socialProvider === 'google' ? 'Opening...' : 'Google'}
                onPress={() => handleSocialAuth('google')}
                disabled={isBusy}
              />
              <SocialAuthButton
                provider="apple"
                label={socialProvider === 'apple' ? 'Opening...' : 'Apple'}
                onPress={() => handleSocialAuth('apple')}
                disabled={isBusy}
              />
            </View>

            <AuthDivider />

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
                  compact
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
                  compact
                />
              )}
            />

            <Pressable className="self-end">
              <Text className="text-[13px] font-semibold text-pharmacy-600">Forgot password?</Text>
            </Pressable>

            <AuthSubmitButton
              label={isSubmitting ? 'Logging In...' : 'Log In'}
              onPress={onSubmit}
              disabled={isBusy}
              compact
            />
          </View>

          <Text className="mt-4 text-center leading-[20px] text-slate-500">
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
