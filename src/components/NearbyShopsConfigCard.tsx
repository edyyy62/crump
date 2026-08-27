import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { SettingsToggleRow } from './SettingsToggleRow';
import {
  enabledTypeSummary,
  PLACE_TYPES,
  toggleEnabledPlaceType,
  type PlaceTypeId,
} from '../shop/placeTypes';
import { isShopPingsEnabled, refreshShopGeofences } from '../shop/pings';
import { loadShopSettings, patchShopSettings } from '../shop/settings';
import { colors } from '../theme';

export function NearbyShopsConfigCard({ initiallyOpen = false }: { initiallyOpen?: boolean }) {
  const insets = useSafeAreaInsets();
  const [enabled, setEnabled] = useState<PlaceTypeId[]>(['grocery']);
  const [open, setOpen] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTypes = useRef<PlaceTypeId[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      void loadShopSettings().then((settings) => setEnabled(settings.enabledPlaceTypes));
    }, []),
  );

  useEffect(() => {
    if (initiallyOpen) setOpen(true);
  }, [initiallyOpen]);

  useEffect(() => {
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, []);

  const persistTypes = (next: PlaceTypeId[]) => {
    pendingTypes.current = next;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      const types = pendingTypes.current;
      if (!types) return;
      void patchShopSettings({ enabledPlaceTypes: types }).then(async () => {
        if (!(await isShopPingsEnabled())) return;
        if (refreshTimer.current) clearTimeout(refreshTimer.current);
        refreshTimer.current = setTimeout(() => {
          void refreshShopGeofences();
        }, 400);
      });
    }, 80);
  };

  const toggle = (id: PlaceTypeId) => {
    setEnabled((current) => {
      const next = toggleEnabledPlaceType(current, id);
      persistTypes(next);
      return next;
    });
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center rounded-[22px] bg-cream px-4 py-3"
      >
        <View className="min-w-0 flex-1">
          <Text className="text-[16px] font-semibold text-ink">Nearby shops</Text>
          <Text className="mt-0.5 text-[13px] text-muted">{enabledTypeSummary(enabled)}</Text>
        </View>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View className="flex-1 justify-end">
          <Pressable
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(26, 26, 26, 0.32)' }}
            onPress={() => setOpen(false)}
          />
          <View
            className="px-5 pt-2"
            style={{
              backgroundColor: colors.cream,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingBottom: Math.max(insets.bottom, 12),
              shadowColor: colors.forestDeep,
              shadowOpacity: 0.28,
              shadowRadius: 28,
              shadowOffset: { width: 0, height: -10 },
              elevation: 24,
            }}
          >
            <View className="mb-2 items-center pt-1">
              <View className="h-1 w-9 rounded-full bg-cream-dark" />
            </View>
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-[17px] font-semibold text-ink">Shop types</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <Text className="text-[16px] font-semibold text-forest">Done</Text>
              </Pressable>
            </View>
            <View className="overflow-hidden rounded-[22px] bg-page">
              {PLACE_TYPES.map((type, index) => (
                <View key={type.id} className={index > 0 ? 'border-t border-cream-dark/80' : undefined}>
                  <SettingsToggleRow
                    title={type.label}
                    value={enabled.includes(type.id)}
                    onToggle={() => toggle(type.id)}
                  />
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
