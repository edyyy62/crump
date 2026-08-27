import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { searchNearbyGroceries } from '../../modules/apple-groceries';
import {
  distanceMeters,
  formatMeters,
  GroceryPlace,
  pickNearestStores,
  SHOP_EXIT_METERS,
  SHOP_RADIUS_METERS,
  SHOP_SEARCH_RADIUS_METERS,
  shopTimerState,
} from './constants';
import { placeCacheStatus } from './placeCache';
import { sortByFavorite } from './placeTypes';
import { loadShopSettings, patchShopSettings } from './settings';
import { cancelDwellPing, fireOrScheduleDwellPing, isShopPingsEnabled } from './pings';

export type NearbyShopRow = GroceryPlace & {
  meters: number;
  distanceLabel: string;
  inRange: boolean;
  timerLabel: string | null;
  dwellProgress: number;
  enteredAt: number | null;
  lastNotifyAt: number | null;
  favorite: boolean;
};

type PlaceCache = {
  at: number;
  origin: { latitude: number; longitude: number };
  typeKey: string;
  places: GroceryPlace[];
};

const CACHE_PATH = `${FileSystem.documentDirectory}nearby-places.json`;

let placeCache: PlaceCache | null = null;
let diskLoaded = false;

async function readDiskCache(): Promise<void> {
  if (diskLoaded) return;
  diskLoaded = true;
  try {
    const info = await FileSystem.getInfoAsync(CACHE_PATH);
    if (!info.exists) return;
    const parsed = JSON.parse(await FileSystem.readAsStringAsync(CACHE_PATH)) as PlaceCache;
    if (!parsed?.places || !parsed.origin || typeof parsed.at !== 'number') return;
    placeCache = parsed;
  } catch {
    placeCache = null;
  }
}

async function writeDiskCache(cache: PlaceCache): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(CACHE_PATH, JSON.stringify(cache));
  } catch {
    // Keep the in-memory cache even if disk write fails.
  }
}

async function fetchPlaces(
  origin: { latitude: number; longitude: number },
  typeIds: string[],
  typeKey: string,
): Promise<GroceryPlace[]> {
  const found = await searchNearbyGroceries(
    origin.latitude,
    origin.longitude,
    SHOP_SEARCH_RADIUS_METERS,
    typeIds,
  );
  const places = pickNearestStores(origin, found);
  placeCache = { at: Date.now(), origin, typeKey, places };
  void writeDiskCache(placeCache);
  return places;
}

async function nearbyPlaces(
  origin: { latitude: number; longitude: number },
  typeIds: string[],
): Promise<GroceryPlace[]> {
  await readDiskCache();
  const typeKey = [...typeIds].sort().join(',');
  const status = placeCache
    ? placeCacheStatus(placeCache, { at: Date.now(), origin, typeKey, now: Date.now() })
    : 'miss';

  if (status === 'fresh' && placeCache) return placeCache.places;

  if (status === 'stale' && placeCache) {
    void fetchPlaces(origin, typeIds, typeKey).catch(() => undefined);
    return placeCache.places;
  }

  try {
    return await fetchPlaces(origin, typeIds, typeKey);
  } catch (error) {
    if (placeCache && placeCache.typeKey === typeKey) return placeCache.places;
    throw error;
  }
}

export function tickNearbyShop(row: NearbyShopRow, now = Date.now()): NearbyShopRow {
  const timed = shopTimerState({
    now,
    meters: row.meters,
    enteredAt: row.enteredAt,
    lastNotifyAt: row.lastNotifyAt,
  });
  return { ...row, ...timed };
}

export async function snapshotNearbyShops(): Promise<NearbyShopRow[]> {
  const permission = await Location.getForegroundPermissionsAsync();
  if (permission.status !== Location.PermissionStatus.GRANTED) {
    const asked = await Location.requestForegroundPermissionsAsync();
    if (asked.status !== Location.PermissionStatus.GRANTED) {
      throw new Error('Location is off. Crump needs it to find nearby shops.');
    }
  }

  const origin = (
    await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    })
  ).coords;
  const settings = await loadShopSettings();
  const nearest = await nearbyPlaces(origin, settings.enabledPlaceTypes);
  const now = Date.now();
  const insideSince = { ...settings.insideSince };
  const lastNotifyAt = { ...settings.lastNotifyAt };
  const favorites = new Set(settings.favoriteIds);
  let dirty = false;

  const rows: NearbyShopRow[] = nearest.map((place) => {
    const meters = distanceMeters(origin, place);
    if (meters <= SHOP_RADIUS_METERS && insideSince[place.id] == null) {
      insideSince[place.id] = now;
      dirty = true;
    }
    if (meters > SHOP_EXIT_METERS && insideSince[place.id] != null) {
      delete insideSince[place.id];
      delete lastNotifyAt[place.id];
      dirty = true;
    }

    const enteredAt = insideSince[place.id] ?? null;
    const notifiedAt = lastNotifyAt[place.id] ?? null;
    const timed = shopTimerState({ now, meters, enteredAt, lastNotifyAt: notifiedAt });

    return {
      ...place,
      meters,
      distanceLabel: formatMeters(meters),
      enteredAt,
      lastNotifyAt: notifiedAt,
      favorite: favorites.has(place.id),
      ...timed,
    };
  });

  if (dirty) {
    await patchShopSettings({ insideSince, lastNotifyAt });
  }

  const ordered = sortByFavorite(rows, settings.favoriteIds);

  if (await isShopPingsEnabled()) {
    for (const row of ordered) {
      if (row.enteredAt != null && row.meters <= SHOP_EXIT_METERS) {
        await fireOrScheduleDwellPing(row.id, row.name);
      } else {
        await cancelDwellPing(row.id);
      }
    }
    const latest = await loadShopSettings();
    return ordered.map((row) =>
      tickNearbyShop({
        ...row,
        lastNotifyAt: latest.lastNotifyAt[row.id] ?? null,
        favorite: latest.favoriteIds.includes(row.id),
      }),
    );
  }

  return ordered;
}
