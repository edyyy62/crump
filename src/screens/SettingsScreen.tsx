import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ShopPingsCard } from '../components/ShopPingsCard';
import { NearbyShopsConfigCard } from '../components/NearbyShopsConfigCard';
import { DeveloperModeCard } from '../components/DeveloperModeCard';
import { colors } from '../theme';

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section?: string | string[] }>();
  const scrollRef = useRef<ScrollView>(null);
  const configY = useRef(0);
  const focus = Array.isArray(section) ? section[0] : section;

  useEffect(() => {
    if (focus !== 'configuration') return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, configY.current - 12), animated: true });
    }, 50);
    return () => clearTimeout(timer);
  }, [focus]);

  return (
    <View className="flex-1 bg-page" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-3 py-1">
        <Pressable onPress={() => router.back()} className="p-2">
          <Ionicons name="chevron-back" size={26} color={colors.forest} />
        </Pressable>
        <Text className="ml-1 text-[18px] font-semibold text-ink">Settings</Text>
      </View>
      <ScrollView
        ref={scrollRef}
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-2 mt-4 text-[13px] font-semibold uppercase tracking-widest text-muted">
          Notifications
        </Text>
        <ShopPingsCard />

        <View
          onLayout={(event) => {
            configY.current = event.nativeEvent.layout.y;
          }}
        >
          <Text className="mb-2 mt-7 text-[13px] font-semibold uppercase tracking-widest text-muted">
            Configuration
          </Text>
          <NearbyShopsConfigCard initiallyOpen={focus === 'configuration'} />
        </View>

        <Text className="mb-2 mt-7 text-[13px] font-semibold uppercase tracking-widest text-muted">
          Others
        </Text>
        <DeveloperModeCard />
      </ScrollView>
    </View>
  );
}
