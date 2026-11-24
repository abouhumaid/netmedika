import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { getAccessToken, getUserRole } from '@/lib/auth-session';

export default function IndexRoute() {
  const [destination, setDestination] = useState<'/login' | '/(tabs)' | '/admin' | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([getAccessToken(), getUserRole()]).then(([token, role]) => {
      if (mounted) setDestination(token ? (role === 'admin' ? '/admin' : '/(tabs)') : '/login');
    }).catch(async () => {
      // A temporary refresh-network failure should keep the active app session.
      const role = await getUserRole();
      if (mounted) setDestination(role === 'admin' ? '/admin' : '/(tabs)');
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (destination) return <Redirect href={destination} />;

  return (
    <View className="flex-1 items-center justify-center bg-[#F4FFFC]">
      <ActivityIndicator color="#0F766E" />
    </View>
  );
}
