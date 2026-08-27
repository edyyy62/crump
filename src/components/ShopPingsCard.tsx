import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Switch, Text, View } from 'react-native';
import { colors } from '../theme';
import { disableShopPings, enableShopPings, isShopPingsEnabled } from '../shop/pings';

export function ShopPingsCard() {
  const [on, setOn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void isShopPingsEnabled().then(setOn);
  }, []);

  const toggle = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      if (on) {
        await disableShopPings();
        setOn(false);
        return;
      }
      const result = await enableShopPings();
      if (result.ok) {
        setOn(true);
      } else {
        setMessage(result.message);
      }
    } finally {
      setBusy(false);
    }
  }, [busy, on]);

  return (
    <View className="rounded-[22px] bg-cream px-4 py-3">
      <View className="flex-row items-center justify-between">
        <View className="min-w-0 flex-1 pr-3">
          <Text className="text-[16px] font-semibold text-ink">Shop pings</Text>
          <Text className="mt-0.5 text-[13px] leading-5 text-muted">
            If you stay at a grocery store for two minutes, ping to scan a label.
          </Text>
        </View>
        {busy ? (
          <ActivityIndicator color={colors.forest} />
        ) : (
          <Switch
            value={on}
            onValueChange={() => void toggle()}
            trackColor={{ false: colors.creamDark, true: colors.organicSoft }}
            thumbColor={on ? colors.forest : colors.muted}
          />
        )}
      </View>
      {message ? <Text className="mt-2 text-[13px] leading-5 text-muted">{message}</Text> : null}
    </View>
  );
}
