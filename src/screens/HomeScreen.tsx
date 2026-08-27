import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { EmptyHistory } from '../components/EmptyHistory';
import { CameraGlyph, GalleryGlyph } from '../components/Glyphs';
import { ScanCard } from '../components/ScanCard';
import { useScanStore } from '../store/scans';
import { colors } from '../theme';

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { scans, ready, load, remove } = useScanStore();
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (!ready) void load();
  }, [load, ready]);

  const importFromGallery = useCallback(async () => {
    if (picking) return;
    setPicking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      if (result.canceled || !result.assets[0]) return;
      router.push({ pathname: '/scan', params: { uri: result.assets[0].uri } });
    } finally {
      setPicking(false);
    }
  }, [picking, router]);

  return (
    <View className="flex-1 bg-page" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-end justify-between px-5 pb-4 pt-3">
        <View>
          <Text className="text-[13px] font-semibold uppercase tracking-[3px] text-forest">
            Label reader
          </Text>
          <Text className="mt-1 text-[40px] font-semibold leading-[44px] tracking-tight text-forest">
            Crump
          </Text>
        </View>
        <Pressable onPress={importFromGallery} className="mb-1 rounded-full bg-cream px-3 py-2">
          <GalleryGlyph color={colors.forest} />
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 140 }}>
        <Text className="mb-3 text-[13px] font-semibold uppercase tracking-widest text-muted">
          History
        </Text>
        {scans.length === 0 ? (
          <EmptyHistory />
        ) : (
          scans.map((scan) => (
            <ScanCard
              key={scan.id}
              scan={scan}
              onPress={() => router.push(`/product/${scan.id}`)}
              onDelete={() => void remove(scan.id)}
            />
          ))
        )}
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 items-center bg-page/0"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Pressable
          onPress={() => router.push('/scan')}
          className="h-[88px] w-[88px] items-center justify-center rounded-full bg-forest"
        >
          <CameraGlyph color={colors.cream} />
        </Pressable>
        <Text className="mt-2 text-[12px] font-semibold uppercase tracking-widest text-forest">
          Scan label
        </Text>
      </View>
    </View>
  );
}
