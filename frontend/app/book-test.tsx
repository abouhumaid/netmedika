import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BookTestScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#F4FFFC]">
      <StatusBar style="dark" />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="mx-auto w-full max-w-[560px] px-4 pb-28 pt-6 sm:px-5">
          <Text className="text-[20px] font-bold text-slateink">Book a Lab Test</Text>

          <View className="mt-4 rounded-[20px] bg-white p-4 shadow-sm">
            <Text className="text-sm text-slate-500">This is a quick lab booking flow placeholder.</Text>
            <Pressable onPress={() => router.push('/book-test/confirm')} className="mt-4 rounded-lg bg-[#0F172A] px-4 py-3 items-center">
              <Text className="text-white font-bold">Continue</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
