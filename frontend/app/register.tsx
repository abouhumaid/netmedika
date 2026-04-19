import { zodResolver } from '@hookform/resolvers/zod';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { AuthSubmitButton, BackArrowButton, FloatingField } from '@/components/auth-ui';
import { Snackbar } from '@/components/snackbar';
import { registerUser } from '@/lib/auth-api';
import { setPendingFlashToast } from '@/lib/flash-toast';

const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Enter your full name.')
    .regex(/^[A-Za-z\s'-]+$/, 'Use letters only for your full name.'),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .regex(/[A-Z]/, 'Include at least one uppercase letter.')
    .regex(/[0-9]/, 'Include at least one number.'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await registerUser({
        username: values.fullName.trim(),
        email: values.email.trim(),
        password: values.password,
      });

      setPendingFlashToast({
        message: 'Account created successfully. Please sign in to continue.',
        tone: 'success',
      });
      router.replace('/login');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to create your account right now.';
      setSnackbarMessage(message);
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
          </View>

          <View className="mt-6 gap-4 rounded-[28px] bg-white p-5 shadow-sm shadow-slate-950/10 sm:p-6">
            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, onBlur, value } }) => (
                <FloatingField
                  label="Full name"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="words"
                  errorMessage={errors.fullName?.message}
                />
              )}
            />

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

            <AuthSubmitButton
              label={isSubmitting ? 'Creating Account...' : 'Create Account'}
              onPress={onSubmit}
              disabled={isSubmitting}
            />
          </View>

          <Text className="mt-5 text-center leading-[21px] text-slate-500">
            Already registered?{' '}
            <Text className="font-bold text-pharmacy-600" onPress={() => router.push('/login')}>
              Login here
            </Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
      <Snackbar
        visible={!!snackbarMessage}
        message={snackbarMessage}
        tone="error"
        onHide={() => setSnackbarMessage('')}
      />
    </SafeAreaView>
  );
}
