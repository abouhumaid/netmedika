import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LandingScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#F8FFFD]">
      <StatusBar style="dark" />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="mx-auto w-full max-w-[560px] gap-[18px] px-4 pb-9 pt-3 sm:px-5">
          <View className="min-h-[500px] justify-between overflow-hidden rounded-[32px] bg-white p-5 shadow-sm shadow-slate-950/10 sm:p-6">
            <View className="absolute right-[-40px] top-[-60px] h-[220px] w-[220px] rounded-full bg-pharmacy-100" />
            <View className="absolute bottom-[72px] right-[-30px] h-[140px] w-[140px] rounded-full bg-amber-100" />

            <View className="self-start rounded-full bg-[#E6FFFB] px-3.5 py-2">
              <Text className="text-[12px] font-bold uppercase tracking-[0.4px] text-pharmacy-600">
                NetMedika Pharmacy Care
              </Text>
            </View>

            <Text className="mt-5 max-w-[92%] text-[30px] font-extrabold leading-9 text-slateink sm:text-[34px] sm:leading-10">
              Order trusted medicines with calm, guided delivery.
            </Text>
            <Text className="mt-3.5 max-w-[94%] text-base leading-6 text-slate-600">
              Refill prescriptions, request pharmacist support, and track every order from one clean
              mobile experience.
            </Text>

            <View className="mt-6 gap-2.5">
              <View className="self-start rounded-[18px] bg-pharmacy-50 px-3.5 py-2.5">
                <Text className="text-sm font-semibold text-slateink">Prescription upload</Text>
              </View>
              <View className="self-start rounded-[18px] bg-pharmacy-50 px-3.5 py-2.5">
                <Text className="text-sm font-semibold text-slateink">Same-day dispatch</Text>
              </View>
              <View className="self-start rounded-[18px] bg-pharmacy-50 px-3.5 py-2.5">
                <Text className="text-sm font-semibold text-slateink">Live order updates</Text>
              </View>
            </View>

            <Pressable
              className="mt-7 items-center rounded-[18px] bg-pharmacy-600 py-[17px] active:bg-pharmacy-700"
              onPress={() => router.push('/login')}>
              <Text className="text-base font-bold text-white">Continue to Login</Text>
            </Pressable>
          </View>

          <View className="gap-3.5">
            <View className="rounded-3xl bg-white p-5 shadow-sm shadow-slate-950/5">
              <Text className="text-[13px] font-bold uppercase tracking-[0.6px] text-pharmacy-600">
                Fast access
              </Text>
              <Text className="mt-2 text-[20px] font-bold leading-7 text-slateink">
                24/7 order placement
              </Text>
            </View>
            <View className="rounded-3xl bg-white p-5 shadow-sm shadow-slate-950/5">
              <Text className="text-[13px] font-bold uppercase tracking-[0.6px] text-pharmacy-600">
                Built for trust
              </Text>
              <Text className="mt-2 text-[20px] font-bold leading-7 text-slateink">
                Clear dosing and delivery steps
              </Text>
            </View>
          </View>

          <View className="rounded-3xl bg-emerald-50 p-5">
            <Text className="text-lg font-bold text-slateink">Suggested brand color</Text>
            <Text className="mt-2 text-[15px] leading-[23px] text-slate-600">
              Use pharmacy teal{' '}
              <Text className="font-extrabold text-pharmacy-600">#0F766E</Text>. It feels
              clinical, reliable, and fresh without looking too cold.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
