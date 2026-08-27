import { Alert, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Swipeable } from 'react-native-gesture-handler';
import type { Scan } from '../types';
import { OverallBadge } from './OverallBadge';
import { formatScanDate } from '../lib/dates';

export function ScanCard({
  scan,
  onPress,
  onDelete,
}: {
  scan: Scan;
  onPress: () => void;
  onDelete: () => void;
}) {
  return (
    <Swipeable
      overshootRight={false}
      renderRightActions={() => (
        <Pressable
          onPress={() => {
            Alert.alert('Delete scan?', 'This removes the photo and every ingredient from this scan.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: onDelete },
            ]);
          }}
          className="mb-3 w-24 items-center justify-center rounded-r-2xl bg-high"
        >
          <Text className="font-semibold text-white">Delete</Text>
        </Pressable>
      )}
    >
      <Pressable
        onPress={onPress}
        className="mb-3 flex-row items-center rounded-2xl bg-cream px-3 py-3"
      >
        <Image
          source={{ uri: scan.photoUri }}
          className="h-16 w-16 rounded-xl bg-cream-dark"
          contentFit="cover"
        />
        <View className="ml-3 min-w-0 flex-1 pr-2">
          <Text className="text-[17px] font-semibold text-ink" numberOfLines={1}>
            {scan.productName}
          </Text>
          <Text className="mt-0.5 text-[13px] text-muted">{formatScanDate(scan.scannedAt)}</Text>
        </View>
        <OverallBadge level={scan.overallLevel} counts={scan.counts} />
      </Pressable>
    </Swipeable>
  );
}
