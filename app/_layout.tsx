import '../global.css';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';
import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { initDb } from '../src/db';
import { useScanStore } from '../src/store/scans';
import { colors } from '../src/theme';
import { enableShopPings, isShopPingsEnabled, markShopNotified, storeIdFromNotificationId } from '../src/shop/pings';

cssInterop(Image, { className: 'style' });

void SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function hrefFromNotification(response: Notifications.NotificationResponse | null): string | null {
  const href = response?.notification.request.content.data?.href;
  return typeof href === 'string' ? href : null;
}

function ShopPingBridge() {
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      if (await isShopPingsEnabled()) {
        await enableShopPings();
      }
    })();

    const received = Notifications.addNotificationReceivedListener((notification) => {
      const storeId = storeIdFromNotificationId(notification.request.identifier);
      if (storeId) void markShopNotified(storeId);
    });
    const response = Notifications.addNotificationResponseReceivedListener((item) => {
      const storeId = storeIdFromNotificationId(item.notification.request.identifier);
      if (storeId) void markShopNotified(storeId);
      const href = hrefFromNotification(item);
      if (href) router.push(href as '/scan');
    });
    void Notifications.getLastNotificationResponseAsync().then((last) => {
      const href = hrefFromNotification(last);
      if (href) {
        router.push(href as '/scan');
        void Notifications.clearLastNotificationResponseAsync();
      }
    });
    return () => {
      received.remove();
      response.remove();
    };
  }, [router]);

  return null;
}

export default function RootLayout() {
  const [booted, setBooted] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const load = useScanStore((s) => s.load);

  useEffect(() => {
    void (async () => {
      try {
        await initDb();
        await load();
        setBooted(true);
        await SplashScreen.hideAsync();
      } catch (error) {
        setBootError(error instanceof Error ? error.message : 'Could not open the local database.');
        await SplashScreen.hideAsync();
      }
    })();
  }, [load]);

  if (bootError) {
    return (
      <View className="flex-1 items-center justify-center bg-page px-8">
        <Text className="text-center text-[22px] font-semibold text-ink">Couldn’t start Crump</Text>
        <Text className="mt-3 text-center text-[15px] leading-6 text-muted">{bootError}</Text>
      </View>
    );
  }

  if (!booted) {
    return (
      <View className="flex-1 items-center justify-center bg-forest">
        <ActivityIndicator color={colors.cream} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <ShopPingBridge />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.page },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="scan" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
          <Stack.Screen name="product/[id]" />
          <Stack.Screen name="ingredient/[id]" />
        </Stack>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
