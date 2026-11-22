import { Tabs } from 'expo-router';
import React from 'react';
import ReusableTabBar, { TabDef } from '@/components/ReusableTabBar';

const TABS: TabDef[] = [
  { name: 'index',  label: 'Home',   icon: 'home-outline',   iconActive: 'home' },
  { name: 'orders', label: 'Orders', icon: 'receipt-outline', iconActive: 'receipt' },
  { name: 'profile',label: 'Profile',icon: 'person-outline',  iconActive: 'person' },
];

export default function AdminTabLayout() {
  return (
    <Tabs tabBar={(props) => <ReusableTabBar {...props} tabs={TABS} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Admin' }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
