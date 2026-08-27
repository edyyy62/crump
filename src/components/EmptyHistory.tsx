import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme';
import { Animated, enter } from '../lib/motion';

const GHOST_ROWS = [
  { name: 'Spring water', grade: 'Organic', tint: colors.organic },
  { name: 'Citric acid', grade: 'Low', tint: colors.low },
  { name: 'Phosphoric acid', grade: 'Moderate', tint: colors.moderate },
  { name: 'Sodium nitrite', grade: 'High', tint: colors.high },
] as const;

export function EmptyHistory({
  onImport,
}: {
  onImport: () => void;
}) {
  const bounce = useSharedValue(0);

  useEffect(() => {
    bounce.value = withRepeat(
      withSequence(
        withTiming(8, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [bounce]);

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounce.value }],
  }));

  return (
    <View className="flex-1 justify-center pb-4 pt-2">
      <View className="rounded-[24px] bg-cream px-5 pb-5 pt-5">
        <Text className="text-[12px] font-semibold uppercase tracking-[3px] text-forest">
          First scan
        </Text>
        <Text className="mt-3 text-[26px] font-semibold leading-8 text-ink">
          Photograph the ingredients list.
        </Text>
        <Text className="mt-2 text-[15px] leading-6 text-muted">
          Crump reads the label, grades each additive, and keeps the scan here.
        </Text>

        <View className="mt-5 overflow-hidden rounded-[18px] bg-page px-4 py-2">
          {GHOST_ROWS.map((row, i) => (
            <Animated.View
              key={row.name}
              entering={enter(i)}
              className={`flex-row items-center py-2.5 ${
                i < GHOST_ROWS.length - 1 ? 'border-b border-cream-dark/80' : ''
              }`}
            >
              <Text className="min-w-0 flex-1 text-[15px] text-ink">{row.name}</Text>
              <Text className="text-[11px] font-semibold" style={{ color: row.tint }}>
                {row.grade}
              </Text>
            </Animated.View>
          ))}
        </View>

        <View className="mt-5 gap-2.5">
          <Step n="1" index={4} text="Frame the printed list so the type is sharp." />
          <Step n="2" index={5} text="Let AI read and grade what’s on the pack." />
          <Step n="3" index={6} text="Open any scan later — grades stay as they were." />
        </View>

        <Pressable onPress={onImport} className="mt-5 self-start">
          <Text className="text-[14px] font-semibold text-forest">Or import a photo from your library</Text>
        </Pressable>
      </View>

      <Animated.View style={arrowStyle} className="mt-7 items-center">
        <Ionicons name="arrow-down" size={20} color={colors.forest} />
        <Text className="mt-1 text-[12px] font-semibold uppercase tracking-widest text-forest">
          Scan label
        </Text>
      </Animated.View>
    </View>
  );
}

function Step({ n, index, text }: { n: string; index: number; text: string }) {
  return (
    <Animated.View entering={enter(index)} className="flex-row items-center gap-3">
      <View className="h-6 w-6 items-center justify-center rounded-full bg-forest">
        <Text className="text-[12px] font-semibold text-cream">{n}</Text>
      </View>
      <Text className="flex-1 text-[14px] leading-5 text-ink">{text}</Text>
    </Animated.View>
  );
}
