import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SettingsToggleRow } from './SettingsToggleRow';
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
    <View className="rounded-[22px] bg-cream">
      <SettingsToggleRow
        title="Shop pings"
        body="Ping to scan a label after two minutes at a listed shop."
        value={on}
        busy={busy}
        onToggle={() => void toggle()}
        footer={
          message ? <Text className="mt-2 text-[13px] leading-5 text-muted">{message}</Text> : null
        }
      />
    </View>
  );
}
