import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Header({
  title,
  subtitle,
  showBack,
  showAvatar,
  avatarLabel = 'N',
  compact,
}: {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showAvatar?: boolean;
  avatarLabel?: string;
  compact?: boolean;
}) {
  const router = useRouter();

  return (
    <View className={`w-full bg-[#0F766E] px-4 shadow-md sm:px-5 ${compact ? 'py-6' : 'py-6'}`}>
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-3 flex-1">
          {showBack ? (
            <Pressable onPress={() => router.back()} className="rounded-full bg-white/20 p-2.5">
              <Ionicons name="chevron-back" size={24} color="white" />
            </Pressable>
          ) : null}

          <View className="flex-1">
            <Text className="text-xl font-black text-white">{title}</Text>
            {subtitle ? <Text className="text-xs text-white/75 mt-1">{subtitle}</Text> : null}
          </View>
        </View>

        {showAvatar ? (
          <View className="h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-white/25">
            <Text className="text-sm font-black text-white">{avatarLabel}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
