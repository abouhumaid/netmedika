import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AdminOrders from '@/components/admin-orders';
import { Snackbar } from '@/components/snackbar';
import { getAccessToken } from '@/lib/auth-session';

export default function AdminOrdersPage() {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let mounted = true;
    getAccessToken().then((t) => { if (mounted) setToken(t); }).catch(() => { if (mounted) setError('Not authenticated'); });
    return () => { mounted = false; };
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-[#F0FDF9]">
      <StatusBar style="dark" />
      {token ? (
        <AdminOrders accessToken={token} setGlobalError={(m) => setError(m)} setGlobalSuccess={(m) => setSuccess(m)} />
      ) : (
        <View className="flex-1 items-center justify-center px-6">
          {error ? (
            <Text className="text-center text-[14px] font-semibold text-rose-600">{error}</Text>
          ) : (
            <ActivityIndicator size="large" color="#0F766E" />
          )}
        </View>
      )}
      <Snackbar visible={!!error} message={error} tone="error" onHide={() => setError('')} />
      <Snackbar visible={!!success} message={success} tone="success" onHide={() => setSuccess('')} />
    </SafeAreaView>
  );
}
