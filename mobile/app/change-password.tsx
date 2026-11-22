import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Header from '@/components/header';
import { Snackbar } from '@/components/snackbar';
import { changePassword } from '@/lib/auth-api';
import { getAccessToken } from '@/lib/auth-session';

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState<'success' | 'error'>('error');
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  async function submit() {
    if (newPassword.length < 8) { setTone('error'); setMessage('Your new password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setTone('error'); setMessage('The new passwords do not match.'); return; }
    try {
      setBusy(true);
      const token = await getAccessToken();
      if (!token) throw new Error('Your session has expired. Please sign in again.');
      await changePassword(token, { current_password: currentPassword, new_password: newPassword });
      setTone('success'); setMessage('Your password has been changed.');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (error) { setTone('error'); setMessage(error instanceof Error ? error.message : 'Unable to change your password.'); }
    finally { setBusy(false); }
  }

  const fields = [
    { key: 'current', label: 'Current password', value: currentPassword, set: setCurrentPassword },
    { key: 'new', label: 'New password', value: newPassword, set: setNewPassword },
    { key: 'confirm', label: 'Confirm new password', value: confirmPassword, set: setConfirmPassword },
  ];

  return <SafeAreaView className="flex-1 bg-[#F4F8F7]"><StatusBar style="dark"/><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}><Header title="Change password"/><View className="px-5 pt-6"><View className="mb-5 rounded-3xl bg-[#0F766E] p-5"><View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Ionicons name="shield-checkmark-outline" size={25} color="white"/></View><Text className="text-xl font-extrabold text-white">Protect your account</Text><Text className="mt-2 text-sm leading-5 text-teal-50">Choose a strong password you do not use elsewhere. It must be at least 8 characters.</Text></View><View className="rounded-3xl border border-slate-100 bg-white p-5">{fields.map((field) => <View key={field.key} className="mb-4"><Text className="mb-2 text-xs font-bold text-slate-600">{field.label}</Text><View className="flex-row items-center rounded-2xl border border-slate-200 bg-slate-50 px-4"><TextInput value={field.value} onChangeText={field.set} placeholder={field.label} placeholderTextColor="#94A3B8" secureTextEntry={!visible[field.key]} autoCapitalize="none" className="h-12 flex-1 text-sm text-slate-900"/><Pressable accessibilityLabel={visible[field.key] ? 'Hide password' : 'Show password'} onPress={() => setVisible((old) => ({ ...old, [field.key]: !old[field.key] }))} hitSlop={8}><Ionicons name={visible[field.key] ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748B"/></Pressable></View></View>)}<Pressable onPress={submit} disabled={busy || !currentPassword || !newPassword || !confirmPassword} style={{ backgroundColor: busy || !currentPassword || !newPassword || !confirmPassword ? '#CBD5E1' : '#0F766E' }} className="mt-1 h-12 flex-row items-center justify-center rounded-2xl">{busy ? <ActivityIndicator color="white"/> : <><Ionicons name="lock-closed-outline" size={17} color="white"/><Text className="ml-2 font-extrabold text-white">Update password</Text></>}</Pressable></View><Pressable onPress={() => router.back()} className="mt-4 flex-row items-center justify-center py-3"><Ionicons name="arrow-back" size={16} color="#0F766E"/><Text className="ml-2 text-sm font-bold text-teal-700">Back to profile</Text></Pressable></View></ScrollView><Snackbar visible={!!message} message={message} tone={tone} onHide={() => setMessage('')}/></SafeAreaView>;
}
