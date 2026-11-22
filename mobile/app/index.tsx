import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LandingScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#F4FFFC]">
      <StatusBar style="dark" />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="mx-auto flex-1 w-full max-w-[560px] px-4 pb-9 pt-3 sm:px-5">
          <View className="min-h-[680px] justify-center overflow-hidden rounded-[34px] bg-white px-6 py-8 shadow-sm shadow-slate-950/10 sm:px-8">
            <View className="absolute left-[-58px] top-[-40px] h-[200px] w-[200px] rounded-full bg-[#D8FFF5]" />
            <View className="absolute bottom-[-36px] right-[-44px] h-[170px] w-[170px] rounded-full bg-[#E5F6FF]" />
            <View className="absolute right-[18%] top-[19%] h-5 w-5 rounded-full bg-emerald-200" />

            <View className="self-center rounded-full bg-pharmacy-50 px-3.5 py-2">
              <Text className="text-[12px] font-bold uppercase tracking-[1.1px] text-pharmacy-600">
                Welcome
              </Text>
            </View>

            <View className="mt-8 items-center">
              <Text className="text-center text-[16px] font-semibold uppercase tracking-[4px] text-slate-400">
                Your digital Med App
              </Text>
              <Text className="mt-4 text-center text-[44px] font-black tracking-[2px] text-slateink sm:text-[52px]">
                <Text className="text-pharmacy-600">Net</Text>
                <Text className="text-emerald-500">medika</Text>
              </Text>
              <Text className="mt-6 text-center text-[28px] font-extrabold leading-9 text-slateink sm:text-[32px] sm:leading-10">
                Welcome
              </Text>
              <Text className="max-w-[330px] text-center text-[22px] leading-9 text-slateink sm:text-[22px] sm:leading-10">
                Sign up to get started
              </Text>
            </View>

            <Pressable
              className="mt-10 self-center rounded-full bg-pharmacy-600 px-12 py-4 active:bg-pharmacy-700"
              onPress={() => router.push('/register')}>
              <Text className="text-sm font-bold text-white uppercase">sign up</Text>
            </Pressable>

            <Text className="mt-5 text-center text-lg leading-6 text-slate-500">
              Already have an account?{' '}
              <Text className="font-bold text-pharmacy-600" onPress={() => router.push('/login')}>
                Log in
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
