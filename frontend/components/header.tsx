import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Header({
  title,
  subtitle,
  showBack,
}: {
  title: string;
  subtitle?: string;
  showBack?: boolean;
}) {
  const router = useRouter();

  return (
    <View className="w-full bg-[#0F766E] px-4 sm:px-5 py-6 rounded-b-[28px] shadow-md">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-3 flex-1">
          {showBack ? (
            <Pressable onPress={() => router.back()} className="rounded-full bg-white/20 p-2.5">
              <Ionicons name="chevron-back" size={24} color="white" />
            </Pressable>
          ) : (
            <View className="h-12 w-12 rounded-full bg-white/25 items-center justify-center border border-white/40">
              <Text className="text-white font-black text-lg">N</Text>
            </View>
          )}

          <View className="flex-1">
            <Text className="text-xl font-black text-white">{title}</Text>
            {subtitle ? <Text className="text-xs text-white/75 mt-1">{subtitle}</Text> : null}
          </View>
        </View>
      </View>
    </View>
  );
}
