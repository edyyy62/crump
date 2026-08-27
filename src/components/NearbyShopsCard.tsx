import { useCallback, useRef, useState } from 'react';
import { Pressable as RNPressable, ScrollView, Text, View } from 'react-native';
import { Pressable, Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { colors } from '../theme';
import { presentPlaceCard } from '../../modules/apple-groceries';
import { snapshotNearbyShops, tickNearbyShop, type NearbyShopRow } from '../shop/nearby';
import { PLACE_TYPES, sortByFavorite } from '../shop/placeTypes';
import { loadShopSettings, toggleFavoritePlace } from '../shop/settings';
import { ShopRowSkeleton } from './SkeletonBlock';

const TAP_SLOP = 10;

function typeLabel(typeId: string | undefined): string | null {
  return PLACE_TYPES.find((type) => type.id === typeId)?.label ?? null;
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function NearbyShopsCard() {
  const router = useRouter();
  const [rows, setRows] = useState<NearbyShopRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [developerMode, setDeveloperMode] = useState(false);
  const [typeCount, setTypeCount] = useState(1);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? rowsRef.current.length > 0;
    if (!silent) {
      setBusy(true);
      setError(null);
    }
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const [nextRows, settings] = await Promise.all([snapshotNearbyShops(), loadShopSettings()]);
        setRows(nextRows);
        setDeveloperMode(settings.developerMode);
        setTypeCount(settings.enabledPlaceTypes.length);
        setError(null);
        setBusy(false);
        return;
      } catch (caught) {
        lastError = caught;
        if (attempt < 2) await wait(400 * (attempt + 1));
      }
    }
    setBusy(false);
    if (rowsRef.current.length === 0) {
      setError(lastError instanceof Error ? lastError.message : 'Could not read nearby shops.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      const locate = setInterval(() => {
        void refresh({ silent: true });
      }, 30_000);
      const tick = setInterval(() => {
        setRows((current) => current.map((row) => tickNearbyShop(row)));
      }, 1000);
      return () => {
        clearInterval(locate);
        clearInterval(tick);
      };
    }, [refresh]),
  );

  const star = async (row: NearbyShopRow) => {
    const settings = await toggleFavoritePlace(row.id);
    setRows((current) =>
      sortByFavorite(
        current.map((item) => ({ ...item, favorite: settings.favoriteIds.includes(item.id) })),
        settings.favoriteIds,
      ),
    );
  };

  return (
    <View className="min-h-0 flex-1 overflow-hidden rounded-[24px] bg-cream">
      <View className="flex-row items-center justify-between px-4 pb-1 pt-3">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="storefront-outline" size={15} color={colors.muted} />
          <Text className="text-[13px] font-semibold uppercase tracking-widest text-muted">Shops</Text>
        </View>
        <Pressable
          onPress={() => router.push({ pathname: '/settings', params: { section: 'configuration' } })}
          hitSlop={8}
          className="h-8 w-8 items-center justify-center"
        >
          <Ionicons name="options-outline" size={18} color={colors.forest} />
        </Pressable>
      </View>
      <ScrollView
        className="min-h-0 flex-1"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 8 }}
      >
        {busy && rows.length === 0 ? (
          <>
            <ShopRowSkeleton />
            <ShopRowSkeleton bordered />
            <ShopRowSkeleton bordered />
          </>
        ) : null}
        {error && rows.length === 0 ? (
          <View className="px-4 py-4">
            <Text className="text-[15px] font-semibold text-ink">Couldn’t load shops</Text>
            <Text className="mt-1 text-[13px] leading-5 text-muted">{error}</Text>
            <Pressable onPress={() => void refresh()} className="mt-3 self-start">
              <Text className="text-[14px] font-semibold text-forest">Retry</Text>
            </Pressable>
          </View>
        ) : null}
        {!busy && !error && rows.length === 0 ? (
          <View className="px-4 py-4">
            <Text className="text-[15px] font-semibold text-ink">No shops nearby</Text>
            <Text className="mt-1 text-[13px] leading-5 text-muted">
              Crump will list places around you for the shop types you turned on.
            </Text>
          </View>
        ) : null}
        {rows.map((row, index) => (
          <ShopRow
            key={row.id}
            row={row}
            bordered={index > 0}
            showType={typeCount > 1}
            showTimer={developerMode}
            onOpen={() => void presentPlaceCard(row)}
            onStar={() => void star(row)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function ShopRow({
  row,
  showType,
  showTimer,
  bordered,
  onOpen,
  onStar,
}: {
  row: NearbyShopRow;
  showType: boolean;
  showTimer: boolean;
  bordered?: boolean;
  onOpen: () => void;
  onStar: () => void;
}) {
  const swipeRef = useRef<Swipeable>(null);
  const skipPress = useRef(false);
  const open = useRef(false);
  const startX = useRef<number | null>(null);
  const kind = showType ? typeLabel(row.typeId) : null;

  const markSwipe = () => {
    skipPress.current = true;
  };

  const armPressAfterClose = () => {
    open.current = false;
    setTimeout(() => {
      if (!open.current) skipPress.current = false;
    }, 400);
  };

  const openDetail = (pageX?: number) => {
    const dragged =
      startX.current != null && pageX != null && Math.abs(pageX - startX.current) > TAP_SLOP;
    startX.current = null;
    if (dragged || skipPress.current || open.current) {
      swipeRef.current?.close();
      return;
    }
    onOpen();
  };

  return (
    <View>
      <Swipeable
        ref={swipeRef}
        friction={1}
        rightThreshold={16}
        overshootRight={false}
        activeOffsetX={[-10, 10]}
        failOffsetY={[-48, 48]}
        containerStyle={{ overflow: 'hidden' }}
        onSwipeableOpenStartDrag={markSwipe}
        onSwipeableCloseStartDrag={markSwipe}
        onSwipeableOpen={() => {
          open.current = true;
          skipPress.current = true;
        }}
        onSwipeableWillClose={armPressAfterClose}
        onSwipeableClose={armPressAfterClose}
        renderRightActions={() => (
          <RNPressable
            onPress={() => {
              onStar();
              swipeRef.current?.close();
            }}
            className={`w-[72px] items-center justify-center ${row.favorite ? 'bg-cream-dark' : 'bg-forest'}`}
          >
            <Ionicons
              name={row.favorite ? 'star' : 'star-outline'}
              size={22}
              color={row.favorite ? colors.forest : colors.cream}
            />
          </RNPressable>
        )}
      >
        <Pressable
          onPressIn={(event) => {
            startX.current = event.nativeEvent.pageX;
          }}
          onPress={(event) => openDetail(event.nativeEvent.pageX)}
        >
          <View
            className={`bg-cream px-4 py-3.5 ${bordered ? 'border-t border-cream-dark/80' : ''}`}
          >
            <View className="flex-row items-center">
              {row.favorite ? (
                <Ionicons name="star" size={14} color={colors.forest} style={{ marginRight: 8 }} />
              ) : null}
              <Text className="min-w-0 flex-1 pr-3 text-[16px] font-medium text-ink" numberOfLines={1}>
                {row.name}
              </Text>
              <Text className="text-[13px] text-muted">{row.inRange ? 'Here' : row.distanceLabel}</Text>
            </View>
            {kind ? (
              <Text className="mt-0.5 text-[12px] text-muted" numberOfLines={1}>
                {kind}
              </Text>
            ) : null}
            {showTimer && row.timerLabel ? (
              <Text className="mt-0.5 text-[12px] text-muted">{row.timerLabel}</Text>
            ) : null}
            {showTimer && (row.inRange || row.dwellProgress > 0) ? (
              <View className="mt-1.5 h-1 overflow-hidden rounded-full bg-cream-dark">
                <View
                  className="h-1 rounded-full bg-forest"
                  style={{ width: `${Math.round(row.dwellProgress * 100)}%` }}
                />
              </View>
            ) : null}
          </View>
        </Pressable>
      </Swipeable>
    </View>
  );
}
