import { useRef } from 'react';
import { Alert, Pressable as RNPressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Pressable, Swipeable } from 'react-native-gesture-handler';
import type { Scan } from '../types';
import { OverallBadge } from './OverallBadge';
import { formatScanDate } from '../lib/dates';
import { Animated, enter } from '../lib/motion';

const TAP_SLOP = 10;

export function ScanCard({
  scan,
  index = 0,
  embedded = false,
  bordered = false,
  onPress,
  onDelete,
}: {
  scan: Scan;
  index?: number;
  embedded?: boolean;
  bordered?: boolean;
  onPress: () => void;
  onDelete: () => void;
}) {
  const swipeRef = useRef<Swipeable>(null);
  const skipPress = useRef(false);
  const open = useRef(false);
  const startX = useRef<number | null>(null);

  const confirmDelete = () => {
    Alert.alert('Delete scan?', 'This removes the photo and every ingredient from this scan.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  };

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
    onPress();
  };

  return (
    <Animated.View entering={enter(index)} className={embedded ? undefined : 'mb-3'}>
      <View className={embedded ? undefined : 'overflow-hidden rounded-3xl'}>
        <Swipeable
          ref={swipeRef}
          friction={1}
          rightThreshold={16}
          overshootRight={false}
          activeOffsetX={[-10, 10]}
          failOffsetY={[-64, 64]}
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
              onPress={confirmDelete}
              className="w-24 items-center justify-center bg-high"
            >
              <Text className="font-semibold text-white">Delete</Text>
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
              className={`flex-row items-center bg-cream px-4 py-3 ${
                bordered ? 'border-t border-cream-dark/80' : ''
              }`}
            >
              <Image
                source={{ uri: scan.photoUri }}
                className="h-[68px] w-[68px] rounded-2xl bg-cream-dark"
                contentFit="cover"
              />
              <View className="ml-3 min-w-0 flex-1 justify-center pr-2">
                <Text className="text-[17px] font-semibold text-ink" numberOfLines={1}>
                  {scan.productName}
                </Text>
                <Text className="mt-0.5 text-[13px] text-muted">{formatScanDate(scan.scannedAt)}</Text>
              </View>
              <OverallBadge compact level={scan.overallLevel} counts={scan.counts} />
            </View>
          </Pressable>
        </Swipeable>
      </View>
    </Animated.View>
  );
}
