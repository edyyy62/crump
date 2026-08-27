import { Platform } from 'react-native';
import { SHOP_DWELL_SECONDS, SHOP_LIVE_ACTIVITY_ENABLED, alreadyPingedThisVisit, dwellRemainingMs } from './constants';
import type { ShopLingerProps } from '../../widgets/ShopLingerActivity';

type LingerHandle = {
  start: (props: ShopLingerProps, url?: string) => { update: (props: ShopLingerProps) => Promise<void>; end: (policy?: string) => Promise<void> };
  getInstances: () => { end: (policy?: string) => Promise<void> }[];
};

const activities = new Map<string, { update: (props: ShopLingerProps) => Promise<void>; end: (policy?: string) => Promise<void> }>();

async function factory(): Promise<LingerHandle | null> {
  if (!SHOP_LIVE_ACTIVITY_ENABLED || Platform.OS !== 'ios') return null;
  const mod = await import('../../widgets/ShopLingerActivity');
  return mod.default as unknown as LingerHandle;
}

function lingerProps(
  storeId: string,
  shopName: string,
  enteredAt: number,
  ready: boolean,
): ShopLingerProps {
  return {
    storeId,
    shopName,
    startEpochMs: enteredAt,
    pingEpochMs: enteredAt + SHOP_DWELL_SECONDS * 1000,
    ready,
  };
}

export async function endShopLinger(storeId: string): Promise<void> {
  if (!SHOP_LIVE_ACTIVITY_ENABLED) return;
  const instance = activities.get(storeId);
  if (!instance) return;
  activities.delete(storeId);
  try {
    await instance.end('immediate');
  } catch {
    // Already dismissed.
  }
}

export async function endAllShopLingers(): Promise<void> {
  if (!SHOP_LIVE_ACTIVITY_ENABLED) return;
  const ids = [...activities.keys()];
  await Promise.all(ids.map((id) => endShopLinger(id)));
  const shop = await factory();
  if (!shop) return;
  await Promise.all(
    shop.getInstances().map(async (instance) => {
      try {
        await instance.end('immediate');
      } catch {
        // Already dismissed.
      }
    }),
  );
}

export async function syncShopLinger(input: {
  storeId: string;
  shopName: string;
  enteredAt: number;
  lastNotifyAt: number | null;
}): Promise<boolean> {
  if (!SHOP_LIVE_ACTIVITY_ENABLED || Platform.OS !== 'ios') return false;
  const shop = await factory();
  if (!shop) return false;
  const now = Date.now();
  const remaining = dwellRemainingMs(input.enteredAt, now);
  const ready = remaining <= 0;
  const pinged = alreadyPingedThisVisit(input.enteredAt, input.lastNotifyAt);
  const props = lingerProps(input.storeId, input.shopName, input.enteredAt, ready || pinged);

  let instance = activities.get(input.storeId);
  try {
    if (!instance) {
      instance = shop.start(props, 'crump://scan');
      activities.set(input.storeId, instance);
    } else {
      await instance.update(props);
    }
  } catch {
    return false;
  }

  return ready && !pinged;
}
