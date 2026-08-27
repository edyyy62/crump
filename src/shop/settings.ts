import * as FileSystem from 'expo-file-system/legacy';

export type ShopSettings = {
  enabled: boolean;
  lastNotifyAt: Record<string, number>;
  insideSince: Record<string, number>;
};

const PATH = `${FileSystem.documentDirectory}shop-pings.json`;

const EMPTY: ShopSettings = { enabled: true, lastNotifyAt: {}, insideSince: {} };

export async function loadShopSettings(): Promise<ShopSettings> {
  const info = await FileSystem.getInfoAsync(PATH);
  if (!info.exists) {
    const initial = { ...EMPTY };
    await saveShopSettings(initial);
    return initial;
  }
  try {
    const parsed = JSON.parse(await FileSystem.readAsStringAsync(PATH)) as Partial<ShopSettings>;
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
      lastNotifyAt: parsed.lastNotifyAt ?? {},
      insideSince: parsed.insideSince ?? {},
    };
  } catch {
    return { ...EMPTY };
  }
}

export async function saveShopSettings(settings: ShopSettings): Promise<void> {
  await FileSystem.writeAsStringAsync(PATH, JSON.stringify(settings));
}

export async function patchShopSettings(patch: Partial<ShopSettings>): Promise<ShopSettings> {
  const current = await loadShopSettings();
  const next: ShopSettings = {
    enabled: patch.enabled ?? current.enabled,
    lastNotifyAt: patch.lastNotifyAt ?? current.lastNotifyAt,
    insideSince: patch.insideSince ?? current.insideSince,
  };
  await saveShopSettings(next);
  return next;
}
