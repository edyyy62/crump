import * as FileSystem from 'expo-file-system/legacy';
import {
  EMPTY_SHOP_SETTINGS,
  parseShopSettings,
  type ShopSettings,
} from './settingsParse';

export type { ShopSettings };
export { parseShopSettings };

const PATH = `${FileSystem.documentDirectory}shop-pings.json`;

export async function loadShopSettings(): Promise<ShopSettings> {
  const info = await FileSystem.getInfoAsync(PATH);
  if (!info.exists) {
    const initial = { ...EMPTY_SHOP_SETTINGS };
    await saveShopSettings(initial);
    return initial;
  }
  try {
    return parseShopSettings(await FileSystem.readAsStringAsync(PATH));
  } catch {
    return { ...EMPTY_SHOP_SETTINGS };
  }
}

export async function saveShopSettings(settings: ShopSettings): Promise<void> {
  await FileSystem.writeAsStringAsync(PATH, JSON.stringify(settings));
}

export async function patchShopSettings(patch: Partial<ShopSettings>): Promise<ShopSettings> {
  const current = await loadShopSettings();
  const next: ShopSettings = {
    enabled: patch.enabled ?? current.enabled,
    developerMode: patch.developerMode ?? current.developerMode,
    favoriteIds: patch.favoriteIds ?? current.favoriteIds,
    enabledPlaceTypes: patch.enabledPlaceTypes ?? current.enabledPlaceTypes,
    lastNotifyAt: patch.lastNotifyAt ?? current.lastNotifyAt,
    insideSince: patch.insideSince ?? current.insideSince,
  };
  await saveShopSettings(next);
  return next;
}

export async function toggleFavoritePlace(placeId: string): Promise<ShopSettings> {
  const current = await loadShopSettings();
  const favoriteIds = current.favoriteIds.includes(placeId)
    ? current.favoriteIds.filter((id) => id !== placeId)
    : [...current.favoriteIds, placeId];
  return patchShopSettings({ favoriteIds });
}
