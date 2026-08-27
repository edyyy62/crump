import { describe, expect, it } from 'vitest';
import { parseShopSettings } from './settingsParse';

describe('parseShopSettings', () => {
  it('fills defaults for an old pings-only file', () => {
    const parsed = parseShopSettings(
      JSON.stringify({ enabled: false, lastNotifyAt: { a: 1 }, insideSince: { a: 2 } }),
    );
    expect(parsed.enabled).toBe(false);
    expect(parsed.developerMode).toBe(false);
    expect(parsed.favoriteIds).toEqual([]);
    expect(parsed.enabledPlaceTypes).toEqual(['grocery']);
    expect(parsed.lastNotifyAt).toEqual({ a: 1 });
    expect(parsed.insideSince).toEqual({ a: 2 });
  });

  it('keeps developer mode and favorites independent of enabled place types', () => {
    const parsed = parseShopSettings(
      JSON.stringify({
        enabled: true,
        developerMode: true,
        favoriteIds: ['s1', 's1', 3],
        enabledPlaceTypes: [],
      }),
    );
    expect(parsed.developerMode).toBe(true);
    expect(parsed.favoriteIds).toEqual(['s1']);
    expect(parsed.enabledPlaceTypes).toEqual([]);
  });
});
