import '../global.css';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { cssInterop } from 'nativewind';
import { Image } from 'expo-image';
import { initDb } from '../src/db';
import { useScanStore } from '../src/store/scans';
import { colors } from '../src/theme';

cssInterop(Image, { className: 'style' });

export default function RootLayout() {
  const [booted, setBooted] = useState(false);
  const load = useScanStore((s) => s.load);

  useEffect(() => {
    void (async () => {
      await initDb();
      await load();
      setBooted(true);
    })();
  }, [load]);

  if (!booted) {
    return (
      <View className="flex-1 items-center justify-center bg-forest">
        <ActivityIndicator color={colors.cream} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.page },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="scan" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="product/[id]" />
        <Stack.Screen name="ingredient/[id]" />
      </Stack>
    </GestureHandlerRootView>
  );
}
