import { describe, expect, it } from 'vitest';
import {
  pickNearestStores,
  alreadyPingedThisVisit,
  dwellNotificationId,
  distanceMeters,
  formatMeters,
  formatDuration,
  shopTimerState,
  dwellRemainingMs,
} from './constants';

describe('pickNearestStores', () => {
  it('keeps the closest twenty automatically', () => {
    const origin = { latitude: 50.08, longitude: 14.43 };
    const places = Array.from({ length: 25 }, (_, index) => ({
      id: `s${index}`,
      name: `Shop ${index}`,
      latitude: origin.latitude + index * 0.01,
      longitude: origin.longitude,
    }));
    const picked = pickNearestStores(origin, places, 20);
    expect(picked).toHaveLength(20);
    expect(picked[0]?.id).toBe('s0');
    expect(picked.at(-1)?.id).toBe('s19');
  });
});

describe('alreadyPingedThisVisit', () => {
  it('blocks a second ping until you leave and come back', () => {
    expect(alreadyPingedThisVisit(1_000, 2_000)).toBe(true);
    expect(alreadyPingedThisVisit(3_000, 2_000)).toBe(false);
    expect(alreadyPingedThisVisit(1_000, undefined)).toBe(false);
  });
});

describe('dwellNotificationId', () => {
  it('namespaces the scheduled notification', () => {
    expect(dwellNotificationId('s50.08000_14.43000')).toBe('crump-dwell-s50.08000_14.43000');
  });
});

describe('formatMeters', () => {
  it('uses meters under a kilometre', () => {
    expect(formatMeters(82)).toBe('82 m');
    expect(formatMeters(1500)).toBe('1.5 km');
  });
});

describe('formatDuration', () => {
  it('formats the dwell countdown', () => {
    expect(formatDuration(90_000)).toBe('1:30');
    expect(formatDuration(2 * 60 * 60 * 1000 + 4 * 60 * 1000)).toBe('2h 4m');
  });
});

describe('dwellRemainingMs', () => {
  it('is zero after two minutes', () => {
    expect(dwellRemainingMs(0, 120_000)).toBe(0);
    expect(dwellRemainingMs(0, 90_000)).toBe(30_000);
  });
});

describe('shopTimerState', () => {
  it('counts down the two-minute linger', () => {
    const state = shopTimerState({
      now: 90_000,
      meters: 40,
      enteredAt: 0,
    });
    expect(state.inRange).toBe(true);
    expect(state.timerLabel).toBe('Ping in 0:30');
    expect(state.dwellProgress).toBeCloseTo(0.75);
  });

  it('asks you to leave after this visit has pinged', () => {
    const state = shopTimerState({
      now: 10 * 60 * 1000,
      meters: 40,
      enteredAt: 1_000,
      lastNotifyAt: 120_000,
    });
    expect(state.timerLabel).toBe('Leave to ping again');
  });
});
