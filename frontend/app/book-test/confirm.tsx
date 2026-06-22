import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BookTestConfirmScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#F4FFFC]">
      <StatusBar style="dark" />
      <View className="mx-auto w-full max-w-[560px] flex-1 justify-center px-4 sm:px-5">
        <View className="rounded-[20px] bg-white p-5 shadow-sm">
          <Text className="text-[20px] font-bold text-slateink">Booking Request Received</Text>
          <Text className="mt-2 text-sm leading-6 text-slate-500">
            We will contact you with the next available lab test appointment.
          </Text>
          <Pressable
            onPress={() => router.replace('/')}
            className="mt-5 items-center rounded-lg bg-[#0F172A] px-4 py-3"
          >
            <Text className="font-bold text-white">Back Home</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
