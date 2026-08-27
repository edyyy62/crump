export type GroceryPlace = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

export const SHOP_RADIUS_METERS = 50;
export const SHOP_DWELL_SECONDS = 120;
export const SHOP_MAX_FENCES = 20;
export const SHOP_SEARCH_RADIUS_METERS = 4000;
/** Live Activities stay off until App Groups / a paid developer team is available. */
export const SHOP_LIVE_ACTIVITY_ENABLED = false;

export const GEOFENCE_TASK = 'crump-shop-geofence';
export const LOCATION_TASK = 'crump-shop-location';

export function dwellNotificationId(storeId: string): string {
  return `crump-dwell-${storeId}`;
}

export function distanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earth = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pickNearestStores(
  origin: { latitude: number; longitude: number },
  places: GroceryPlace[],
  limit = SHOP_MAX_FENCES,
): GroceryPlace[] {
  return [...places]
    .sort((left, right) => distanceMeters(origin, left) - distanceMeters(origin, right))
    .slice(0, limit);
}

export function alreadyPingedThisVisit(
  enteredAt: number | null | undefined,
  lastNotifyAt: number | null | undefined,
): boolean {
  if (enteredAt == null || lastNotifyAt == null) return false;
  return lastNotifyAt >= enteredAt;
}

export function formatMeters(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export const SHOP_EXIT_METERS = SHOP_RADIUS_METERS + 30;
/** Faster than a lingering walk — skip or cancel pings while in transit. */
export const SHOP_TRANSIT_SPEED_MPS = 4;

export function validSpeedMps(speed: number | null | undefined): number | null {
  if (speed == null || speed < 0) return null;
  return speed;
}

export function shouldEndVisit(
  meters: number,
  speedMps?: number | null,
): boolean {
  if (meters > SHOP_EXIT_METERS) return true;
  const speed = validSpeedMps(speedMps);
  return speed != null && speed > SHOP_TRANSIT_SPEED_MPS;
}

export function dwellRemainingMs(enteredAt: number, now: number): number {
  return SHOP_DWELL_SECONDS * 1000 - (now - enteredAt);
}

export function shopTimerState(input: {
  now: number;
  meters: number;
  enteredAt?: number | null;
  lastNotifyAt?: number | null;
}): { inRange: boolean; timerLabel: string | null; dwellProgress: number } {
  const inRange = input.meters <= SHOP_RADIUS_METERS;
  const lingering = input.enteredAt != null && input.meters <= SHOP_EXIT_METERS;

  if (lingering && alreadyPingedThisVisit(input.enteredAt, input.lastNotifyAt)) {
    return { inRange, timerLabel: 'Leave to ping again', dwellProgress: 1 };
  }

  if (lingering && input.enteredAt != null) {
    const remaining = dwellRemainingMs(input.enteredAt, input.now);
    if (remaining > 0) {
      return {
        inRange,
        timerLabel: `Ping in ${formatDuration(remaining)}`,
        dwellProgress: 1 - remaining / (SHOP_DWELL_SECONDS * 1000),
      };
    }
    return { inRange, timerLabel: 'Ready to ping', dwellProgress: 1 };
  }

  return { inRange, timerLabel: null, dwellProgress: 0 };
}
