import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { searchNearbyGroceries } from '../../modules/apple-groceries';
import {
  alreadyPingedThisVisit,
  distanceMeters,
  dwellNotificationId,
  dwellRemainingMs,
  GEOFENCE_TASK,
  LOCATION_TASK,
  pickNearestStores,
  SHOP_LIVE_ACTIVITY_ENABLED,
  SHOP_RADIUS_METERS,
  SHOP_SEARCH_RADIUS_METERS,
  SHOP_TRANSIT_SPEED_MPS,
  shouldEndVisit,
  validSpeedMps,
  type GroceryPlace,
} from './constants';
import { endAllShopLingers, endShopLinger, syncShopLinger } from './liveActivity';
import { loadShopSettings, patchShopSettings } from './settings';

const PING_CONTENT: Notifications.NotificationContentInput = {
  title: 'Near a shop',
  body: 'Linger a moment, then scan a label.',
  data: { href: '/scan' },
};

const stores = new Map<string, GroceryPlace>();
let ignoreGeofenceEnterUntil = 0;
let lastFenceAt = 0;
let lastFenceOrigin: { latitude: number; longitude: number } | null = null;

const SPARSE_LOCATION: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.Balanced,
  distanceInterval: 400,
  pausesUpdatesAutomatically: true,
  activityType: Location.ActivityType.Other,
  showsBackgroundLocationIndicator: false,
  timeInterval: 5 * 60 * 1000,
};

const LINGER_LOCATION: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.High,
  distanceInterval: 20,
  pausesUpdatesAutomatically: false,
  activityType: Location.ActivityType.Other,
  showsBackgroundLocationIndicator: false,
  timeInterval: 15_000,
};

export function rememberStoreName(storeId: string, name: string): void {
  const current = stores.get(storeId);
  stores.set(storeId, {
    id: storeId,
    name,
    latitude: current?.latitude ?? Number.NaN,
    longitude: current?.longitude ?? Number.NaN,
  });
}

function rememberStore(place: GroceryPlace): void {
  stores.set(place.id, place);
}

async function syncLocationWatch(lingering: number): Promise<void> {
  if (!(await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK))) {
    if (lingering <= 0) return;
  }
  await Location.startLocationUpdatesAsync(
    LOCATION_TASK,
    lingering > 0 ? LINGER_LOCATION : SPARSE_LOCATION,
  );
}

export async function cancelDwellPing(storeId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(dwellNotificationId(storeId));
  if (SHOP_LIVE_ACTIVITY_ENABLED) await endShopLinger(storeId);
}

async function endVisits(storeIds: string[]): Promise<void> {
  const unique = [...new Set(storeIds)];
  if (unique.length === 0) return;
  const settings = await loadShopSettings();
  const insideSince = { ...settings.insideSince };
  const lastNotifyAt = { ...settings.lastNotifyAt };
  for (const storeId of unique) {
    await cancelDwellPing(storeId);
    delete insideSince[storeId];
    delete lastNotifyAt[storeId];
  }
  await patchShopSettings({ insideSince, lastNotifyAt });
  await syncLocationWatch(Object.keys(insideSince).length);
}

export async function reconcileShopVisits(coords: {
  latitude: number;
  longitude: number;
  speed?: number | null;
}): Promise<void> {
  const settings = await loadShopSettings();
  if (!settings.enabled) return;
  const speed = validSpeedMps(coords.speed);
  const drop: string[] = [];
  for (const storeId of Object.keys(settings.insideSince)) {
    const place = stores.get(storeId);
    if (!place || Number.isNaN(place.latitude) || Number.isNaN(place.longitude)) continue;
    if (shouldEndVisit(distanceMeters(coords, place), speed)) drop.push(storeId);
  }
  await endVisits(drop);
}

export async function onBackgroundLocation(coords: {
  latitude: number;
  longitude: number;
  speed?: number | null;
}): Promise<void> {
  await reconcileShopVisits(coords);
  const moved =
    lastFenceOrigin == null || distanceMeters(lastFenceOrigin, coords) > 200;
  if (moved || Date.now() - lastFenceAt > 60_000) {
    await refreshShopGeofences(coords);
  }
}

export async function refreshShopGeofences(coords?: {
  latitude: number;
  longitude: number;
  speed?: number | null;
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
  const speed = validSpeedMps(coords?.speed ?? position.speed);

  let found: GroceryPlace[] = [];
  try {
    found = await searchNearbyGroceries(
      position.latitude,
      position.longitude,
      SHOP_SEARCH_RADIUS_METERS,
      settings.enabledPlaceTypes,
    );
  } catch {
    return lastFenceOrigin ? 1 : 0;
  }
  const nearest = pickNearestStores(position, found);
  lastFenceAt = Date.now();
  lastFenceOrigin = { latitude: position.latitude, longitude: position.longitude };

  const keep = new Set(nearest.map((place) => place.id));
  const drop: string[] = [];
  for (const storeId of Object.keys(settings.insideSince)) {
    if (!keep.has(storeId)) drop.push(storeId);
  }
  for (const place of nearest) {
    rememberStore(place);
    const meters = distanceMeters(position, place);
    if (settings.insideSince[place.id] != null && shouldEndVisit(meters, speed)) {
      drop.push(place.id);
    }
  }
  await endVisits(drop);

  if (nearest.length === 0) {
    await endVisits(Object.keys((await loadShopSettings()).insideSince));
    if (await Location.hasStartedGeofencingAsync(GEOFENCE_TASK)) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK);
    }
    return 0;
  }

  const regions: Location.LocationRegion[] = nearest.map((place) => ({
    identifier: place.id,
    latitude: place.latitude,
    longitude: place.longitude,
    radius: SHOP_RADIUS_METERS,
    notifyOnEnter: true,
    notifyOnExit: true,
  }));

  await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
  ignoreGeofenceEnterUntil = Date.now() + 8_000;

  if (speed == null || speed <= SHOP_TRANSIT_SPEED_MPS) {
    for (const place of nearest) {
      const meters = distanceMeters(position, place);
      if (meters <= SHOP_RADIUS_METERS && !shouldEndVisit(meters, speed)) {
        await fireOrScheduleDwellPing(place.id, place.name);
      }
    }
  }

  await syncLocationWatch(Object.keys((await loadShopSettings()).insideSince).length);
  return regions.length;
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
    await syncLocationWatch(Object.keys(settings.insideSince).length + 1);
  }
  if (shopName) rememberStoreName(storeId, shopName);
  if (alreadyPingedThisVisit(enteredAt, settings.lastNotifyAt[storeId])) {
    await cancelDwellPing(storeId);
    return;
  }

  if (SHOP_LIVE_ACTIVITY_ENABLED) {
    const shouldMark = await syncShopLinger({
      storeId,
      shopName: shopName ?? stores.get(storeId)?.name ?? 'Grocery',
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
  if (eventType === Location.GeofencingEventType.Exit) {
    await endVisits([regionId]);
    return;
  }
  if (eventType !== Location.GeofencingEventType.Enter) return;
  if (Date.now() < ignoreGeofenceEnterUntil) return;

  const last = await Location.getLastKnownPositionAsync();
  const speed = validSpeedMps(last?.coords.speed);
  if (speed != null && speed > SHOP_TRANSIT_SPEED_MPS) return;
  const place = stores.get(regionId);
  if (last && place && !Number.isNaN(place.latitude) && !Number.isNaN(place.longitude)) {
    if (shouldEndVisit(distanceMeters(last.coords, place), speed)) return;
  }

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
  await Location.startLocationUpdatesAsync(LOCATION_TASK, SPARSE_LOCATION);
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
