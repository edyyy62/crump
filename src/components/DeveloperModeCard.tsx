import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SettingsToggleRow } from './SettingsToggleRow';
import { loadShopSettings, patchShopSettings } from '../shop/settings';

const ENABLED_FEATURES = ['Ping countdown on nearby shops', 'Linger progress while you wait'];

export function DeveloperModeCard() {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void loadShopSettings().then((settings) => setOn(settings.developerMode));
    }, []),
  );

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const next = !on;
      await patchShopSettings({ developerMode: next });
      setOn(next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="rounded-[22px] bg-cream">
      <SettingsToggleRow
        title="Developer mode"
        value={on}
        busy={busy}
        onToggle={() => void toggle()}
        footer={
          on ? (
            <View className="mt-2 gap-1">
              {ENABLED_FEATURES.map((item) => (
                <Text key={item} className="text-[13px] leading-5 text-muted">
                  {`\u2022  ${item}`}
                </Text>
              ))}
            </View>
          ) : null
        }
      />
    </View>
  );
}
