import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ShopPingsCard } from '../components/ShopPingsCard';
import { NearbyShopsCard } from '../components/NearbyShopsCard';
import { colors } from '../theme';

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View className="flex-1 bg-page" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-3 py-1">
        <Pressable onPress={() => router.back()} className="p-2">
          <Ionicons name="chevron-back" size={26} color={colors.forest} />
        </Pressable>
        <Text className="ml-1 text-[18px] font-semibold text-ink">Settings</Text>
      </View>
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-2 mt-4 text-[13px] font-semibold uppercase tracking-widest text-muted">
          Notifications
        </Text>
        <ShopPingsCard />
        <NearbyShopsCard />
      </ScrollView>
    </View>
  );
}
