import { distanceMeters } from './constants';

export const PLACE_CACHE_FRESH_MS = 3 * 60_000;
export const PLACE_CACHE_STALE_MS = 30 * 60_000;
export const PLACE_CACHE_FRESH_MOVE_METERS = 250;
export const PLACE_CACHE_STALE_MOVE_METERS = 1_200;

export type PlaceCacheMeta = {
  at: number;
  origin: { latitude: number; longitude: number };
  typeKey: string;
};

export function placeCacheStatus(
  cache: PlaceCacheMeta,
  query: PlaceCacheMeta & { now: number },
): 'fresh' | 'stale' | 'miss' {
  if (cache.typeKey !== query.typeKey) return 'miss';
  const age = query.now - cache.at;
  const moved = distanceMeters(cache.origin, query.origin);
  if (age < PLACE_CACHE_FRESH_MS && moved < PLACE_CACHE_FRESH_MOVE_METERS) return 'fresh';
  if (age < PLACE_CACHE_STALE_MS && moved < PLACE_CACHE_STALE_MOVE_METERS) return 'stale';
  return 'miss';
}
