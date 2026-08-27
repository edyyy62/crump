import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useScanStore } from '../store/scans';
import { useAnalysisStore } from '../store/analysis';
import { EmptyHistory } from '../components/EmptyHistory';
import { NearbyShopsCard } from '../components/NearbyShopsCard';
import { ScanCard } from '../components/ScanCard';
import { PendingJobCard } from '../components/PendingJobCard';
import { colors } from '../theme';
import { hasOpenAiKey } from '../lib/config';

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { scans, ready, load, remove } = useScanStore();
  const jobs = useAnalysisStore((s) => s.jobs);
  const retryJob = useAnalysisStore((s) => s.retry);
  const dismissJob = useAnalysisStore((s) => s.dismiss);
  const [picking, setPicking] = useState(false);
  const empty = jobs.length === 0 && scans.length === 0;

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
      <View className="flex-row items-end justify-between px-5 pb-3 pt-2">
        <View>
          <Text className="text-[12px] font-semibold uppercase tracking-[4px] text-forest">
            What’s in it
          </Text>
          <Text className="mt-1 text-[36px] font-semibold leading-[40px] tracking-tight text-forest">
            Crump
          </Text>
        </View>
        <View className="mb-1 flex-row items-center gap-2">
          <Pressable
            onPress={importFromGallery}
            className="h-11 w-11 items-center justify-center rounded-full bg-cream"
          >
            <Ionicons name="images-outline" size={22} color={colors.forest} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/settings')}
            className="h-11 w-11 items-center justify-center rounded-full bg-cream"
          >
            <Ionicons name="settings-outline" size={22} color={colors.forest} />
          </Pressable>
        </View>
      </View>

      <View
        className="min-h-0 flex-1 flex-col gap-4 px-5"
        style={{ paddingBottom: Math.max(insets.bottom, 16) + 108 }}
      >
        {!hasOpenAiKey() ? (
          <View className="rounded-[22px] bg-cream px-4 py-3">
            <Text className="text-[13px] leading-5 text-muted">
              Add OPENAI_API_KEY to a local .env, then restart Expo, to enable label reading.
            </Text>
          </View>
        ) : null}

        <View className="min-h-0 flex-[2] overflow-hidden rounded-[24px] bg-cream">
          <View className="flex-row items-center justify-between px-4 pb-1 pt-3">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="time-outline" size={15} color={colors.muted} />
              <Text className="text-[13px] font-semibold uppercase tracking-widest text-muted">
                History
              </Text>
            </View>
            {empty ? null : <Text className="text-[13px] text-muted">{scans.length}</Text>}
          </View>
          <ScrollView
            className="min-h-0 flex-1"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
              {empty ? (
                <EmptyHistory compact embedded onImport={importFromGallery} />
              ) : (
                <>
                  {jobs.map((job, index) => (
                    <PendingJobCard
                      key={job.id}
                      job={job}
                      index={index}
                      embedded
                      onRetry={() => void retryJob(job.id)}
                      onDismiss={() => void dismissJob(job.id)}
                    />
                  ))}
                  {scans.map((scan, index) => (
                    <ScanCard
                      key={scan.id}
                      scan={scan}
                      index={jobs.length + index}
                      embedded
                      bordered={jobs.length + index > 0}
                      onPress={() => router.push(`/product/${scan.id}`)}
                      onDelete={() => void remove(scan.id)}
                    />
                  ))}
                </>
              )}
          </ScrollView>
        </View>

        <View className="min-h-0 flex-1">
          <NearbyShopsCard />
        </View>
      </View>

      <View
        className="absolute bottom-0 left-0 right-0 items-center"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Pressable
          onPress={() => router.push('/scan')}
          className="h-[80px] w-[80px] items-center justify-center rounded-full bg-forest"
          style={{
            shadowColor: colors.forestDeep,
            shadowOpacity: 0.32,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
          }}
        >
          <Ionicons name="camera" size={36} color={colors.cream} />
        </Pressable>
        <Text className="mt-2 text-[12px] font-semibold uppercase tracking-widest text-forest">
          Scan label
        </Text>
      </View>
    </View>
  );
}
