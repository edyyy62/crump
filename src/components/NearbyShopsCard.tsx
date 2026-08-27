import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme';
import { snapshotNearbyShops, tickNearbyShop, type NearbyShopRow } from '../shop/nearby';

const ease = Easing.out(Easing.cubic);

export function NearbyShopsCard() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NearbyShopRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flip = useSharedValue(0);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setRows(await snapshotNearbyShops());
    } catch {
      setError('Could not read nearby shops. Check location permission.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setBusy(true);
    void refresh();
    const locate = setInterval(() => {
      void refresh();
    }, 2500);
    const tick = setInterval(() => {
      setRows((current) => current.map((row) => tickNearbyShop(row)));
    }, 1000);
    return () => {
      clearInterval(locate);
      clearInterval(tick);
    };
  }, [open, refresh]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${flip.value * 180}deg` }],
  }));

  const toggle = () => {
    setOpen((current) => {
      const next = !current;
      flip.value = withTiming(next ? 1 : 0, { duration: 280, easing: ease });
      return next;
    });
  };

  return (
    <View className="mt-3 rounded-[22px] bg-cream px-4 py-3">
      <Pressable onPress={toggle} className="flex-row items-center">
        <View className="min-w-0 flex-1 pr-3">
          <Text className="text-[16px] font-semibold text-ink">Nearby shops</Text>
          <Text className="mt-0.5 text-[13px] leading-5 text-muted">
            Closest groceries, meters away, and the two-minute linger.
          </Text>
        </View>
        <Animated.View style={chevronStyle}>
          <Ionicons name="chevron-down" size={20} color={colors.muted} />
        </Animated.View>
      </Pressable>
      {open ? (
        <Animated.View
          entering={FadeInDown.duration(320).easing(ease)}
          exiting={FadeOutUp.duration(220).easing(ease)}
          className="mt-3 overflow-hidden"
        >
          {busy && rows.length === 0 ? <ActivityIndicator color={colors.forest} /> : null}
          {error ? <Text className="text-[13px] leading-5 text-muted">{error}</Text> : null}
          {!busy && !error && rows.length === 0 ? (
            <Text className="text-[13px] leading-5 text-muted">No grocery stores nearby.</Text>
          ) : null}
          {rows.map((row, index) => (
            <View
              key={row.id}
              className={`py-2.5 ${index > 0 ? 'border-t border-cream-dark/80' : ''}`}
            >
              <View className="flex-row items-baseline justify-between gap-3">
                <Text className="min-w-0 flex-1 text-[15px] font-medium text-ink" numberOfLines={1}>
                  {row.name}
                </Text>
                <Text className="text-[13px] font-semibold text-forest">{row.distanceLabel}</Text>
              </View>
              {row.timerLabel ? (
                <Text className="mt-0.5 text-[12px] text-muted">{row.timerLabel}</Text>
              ) : null}
              {row.inRange || row.dwellProgress > 0 ? (
                <View className="mt-1.5 h-1 overflow-hidden rounded-full bg-cream-dark">
                  <View
                    className="h-1 rounded-full bg-forest"
                    style={{ width: `${Math.round(row.dwellProgress * 100)}%` }}
                  />
                </View>
              ) : null}
            </View>
          ))}
        </Animated.View>
      ) : null}
    </View>
  );
}
