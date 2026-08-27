import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { searchNearbyGroceries } from '../../modules/apple-groceries';
import {
  alreadyPingedThisVisit,
  dwellNotificationId,
  dwellRemainingMs,
  GEOFENCE_TASK,
  LOCATION_TASK,
  pickNearestStores,
  SHOP_LIVE_ACTIVITY_ENABLED,
  SHOP_RADIUS_METERS,
  SHOP_SEARCH_RADIUS_METERS,
} from './constants';
import { endAllShopLingers, endShopLinger, syncShopLinger } from './liveActivity';
import { loadShopSettings, patchShopSettings } from './settings';

const PING_CONTENT: Notifications.NotificationContentInput = {
  title: 'Near a shop',
  body: 'Linger a moment, then scan a label.',
  data: { href: '/scan' },
};

const storeNames = new Map<string, string>();
let ignoreGeofenceUntil = 0;

export function rememberStoreName(storeId: string, name: string): void {
  storeNames.set(storeId, name);
}

export async function refreshShopGeofences(coords?: {
  latitude: number;
  longitude: number;
}): Promise<number> {
  if (Platform.OS !== 'ios') return 0;
  const settings = await loadShopSettings();
  if (!settings.enabled) return 0;

  const position =
    coords ??
    (
      await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
    ).coords;

  const found = await searchNearbyGroceries(
    position.latitude,
    position.longitude,
    SHOP_SEARCH_RADIUS_METERS,
  );
  const nearest = pickNearestStores(position, found);
  const regions: Location.LocationRegion[] = nearest.map((place) => {
    rememberStoreName(place.id, place.name);
    return {
      identifier: place.id,
      latitude: place.latitude,
      longitude: place.longitude,
      radius: SHOP_RADIUS_METERS,
      notifyOnEnter: true,
      notifyOnExit: true,
    };
  });

  if (regions.length === 0) {
    if (await Location.hasStartedGeofencingAsync(GEOFENCE_TASK)) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK);
    }
    return 0;
  }

  await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
  ignoreGeofenceUntil = Date.now() + 8_000;
  return regions.length;
}

export async function cancelDwellPing(storeId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(dwellNotificationId(storeId));
  if (SHOP_LIVE_ACTIVITY_ENABLED) await endShopLinger(storeId);
}

export async function fireOrScheduleDwellPing(storeId: string, shopName?: string): Promise<void> {
  const settings = await loadShopSettings();
  if (!settings.enabled) return;
  const now = Date.now();
  const enteredAt = settings.insideSince[storeId] ?? now;
  if (settings.insideSince[storeId] == null) {
    await patchShopSettings({
      insideSince: { ...settings.insideSince, [storeId]: enteredAt },
    });
  }
  if (shopName) rememberStoreName(storeId, shopName);
  if (alreadyPingedThisVisit(enteredAt, settings.lastNotifyAt[storeId])) {
    await cancelDwellPing(storeId);
    return;
  }

  if (SHOP_LIVE_ACTIVITY_ENABLED) {
    const shouldMark = await syncShopLinger({
      storeId,
      shopName: shopName ?? storeNames.get(storeId) ?? 'Grocery',
      enteredAt,
      lastNotifyAt: settings.lastNotifyAt[storeId] ?? null,
    });
    if (shouldMark) await markShopNotified(storeId);
  }

  const id = dwellNotificationId(storeId);
  const remainingMs = dwellRemainingMs(enteredAt, now);
  if (remainingMs <= 0) {
    await Notifications.cancelScheduledNotificationAsync(id);
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: PING_CONTENT,
      trigger: null,
    });
    await markShopNotified(storeId);
    return;
  }

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  if (scheduled.some((item) => item.identifier === id)) return;

  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: PING_CONTENT,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, Math.ceil(remainingMs / 1000)),
      repeats: false,
    },
  });
}

export async function handleGeofenceEvent(eventType: Location.GeofencingEventType, regionId: string) {
  if (Date.now() < ignoreGeofenceUntil) return;
  if (eventType === Location.GeofencingEventType.Exit) {
    await cancelDwellPing(regionId);
    const settings = await loadShopSettings();
    const insideSince = { ...settings.insideSince };
    const lastNotifyAt = { ...settings.lastNotifyAt };
    delete insideSince[regionId];
    delete lastNotifyAt[regionId];
    await patchShopSettings({ insideSince, lastNotifyAt });
    return;
  }
  if (eventType !== Location.GeofencingEventType.Enter) return;
  await fireOrScheduleDwellPing(regionId);
}

export async function markShopNotified(storeId: string): Promise<void> {
  const settings = await loadShopSettings();
  await patchShopSettings({
    lastNotifyAt: { ...settings.lastNotifyAt, [storeId]: Date.now() },
  });
}

export async function enableShopPings(): Promise<{ ok: true } | { ok: false; message: string }> {
  if (Platform.OS !== 'ios') {
    return { ok: false, message: 'Shop pings use Apple Maps on iPhone.' };
  }

  const notify = await Notifications.requestPermissionsAsync();
  if (!notify.granted) {
    return { ok: false, message: 'Notifications are off. Enable them in Settings to get a scan ping.' };
  }

  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== Location.PermissionStatus.GRANTED) {
    return { ok: false, message: 'Location is off. Crump needs it to notice nearby shops.' };
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== Location.PermissionStatus.GRANTED) {
    return {
      ok: false,
      message: 'Choose “Always” for location so a shop ping can arrive while Crump is closed.',
    };
  }

  await patchShopSettings({ enabled: true });
  await refreshShopGeofences();
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 400,
    pausesUpdatesAutomatically: true,
    activityType: Location.ActivityType.Other,
    showsBackgroundLocationIndicator: false,
    timeInterval: 5 * 60 * 1000,
  });
  return { ok: true };
}

export async function disableShopPings(): Promise<void> {
  await patchShopSettings({ enabled: false, insideSince: {}, lastNotifyAt: {} });
  if (SHOP_LIVE_ACTIVITY_ENABLED) await endAllShopLingers();
  if (await Location.hasStartedGeofencingAsync(GEOFENCE_TASK)) {
    await Location.stopGeofencingAsync(GEOFENCE_TASK);
  }
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.identifier.startsWith('crump-dwell-'))
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

export async function isShopPingsEnabled(): Promise<boolean> {
  return (await loadShopSettings()).enabled;
}

export function storeIdFromNotificationId(identifier: string): string | null {
  if (!identifier.startsWith('crump-dwell-')) return null;
  return identifier.slice('crump-dwell-'.length);
}
