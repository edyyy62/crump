import * as Location from 'expo-location';
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
};

const SEARCH_TTL_MS = 20_000;
const SEARCH_MOVE_METERS = 200;

let placeCache: {
  at: number;
  origin: { latitude: number; longitude: number };
  places: GroceryPlace[];
} | null = null;

async function nearbyPlaces(origin: { latitude: number; longitude: number }): Promise<GroceryPlace[]> {
  if (
    placeCache &&
    Date.now() - placeCache.at < SEARCH_TTL_MS &&
    distanceMeters(placeCache.origin, origin) < SEARCH_MOVE_METERS
  ) {
    return placeCache.places;
  }
  const found = await searchNearbyGroceries(
    origin.latitude,
    origin.longitude,
    SHOP_SEARCH_RADIUS_METERS,
  );
  const places = pickNearestStores(origin, found);
  placeCache = { at: Date.now(), origin, places };
  return places;
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
    if (asked.status !== Location.PermissionStatus.GRANTED) return [];
  }

  const origin = (
    await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    })
  ).coords;
  const nearest = await nearbyPlaces(origin);
  const settings = await loadShopSettings();
  const now = Date.now();
  const insideSince = { ...settings.insideSince };
  const lastNotifyAt = { ...settings.lastNotifyAt };
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
      ...timed,
    };
  });

  if (dirty) {
    await patchShopSettings({ insideSince, lastNotifyAt });
  }

  if (await isShopPingsEnabled()) {
    for (const row of rows) {
      if (row.enteredAt != null && row.meters <= SHOP_EXIT_METERS) {
        await fireOrScheduleDwellPing(row.id, row.name);
      } else {
        await cancelDwellPing(row.id);
      }
    }
    const latest = await loadShopSettings();
    return rows.map((row) =>
      tickNearbyShop({
        ...row,
        lastNotifyAt: latest.lastNotifyAt[row.id] ?? null,
      }),
    );
  }

  return rows;
}
