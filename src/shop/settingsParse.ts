import { defaultEnabledPlaceTypes, normalizeEnabledPlaceTypes, type PlaceTypeId } from './placeTypes';

export type ShopSettings = {
  enabled: boolean;
  developerMode: boolean;
  favoriteIds: string[];
  enabledPlaceTypes: PlaceTypeId[];
  lastNotifyAt: Record<string, number>;
  insideSince: Record<string, number>;
};

export const EMPTY_SHOP_SETTINGS: ShopSettings = {
  enabled: true,
  developerMode: false,
  favoriteIds: [],
  enabledPlaceTypes: defaultEnabledPlaceTypes(),
  lastNotifyAt: {},
  insideSince: {},
};

function uniqueStrings(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const value of raw) {
    if (typeof value !== 'string' || seen.has(value)) continue;
    seen.add(value);
    ids.push(value);
  }
  return ids;
}

export function parseShopSettings(raw: string): ShopSettings {
  try {
    const parsed = JSON.parse(raw) as Partial<ShopSettings>;
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
      developerMode: parsed.developerMode === true,
      favoriteIds: uniqueStrings(parsed.favoriteIds),
      enabledPlaceTypes: normalizeEnabledPlaceTypes(parsed.enabledPlaceTypes),
      lastNotifyAt: parsed.lastNotifyAt ?? {},
      insideSince: parsed.insideSince ?? {},
    };
  } catch {
    return { ...EMPTY_SHOP_SETTINGS };
  }
}
