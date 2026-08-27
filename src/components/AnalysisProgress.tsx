import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { ANALYSIS_STEPS } from '../domain/analyze';
import { colors } from '../theme';

export function AnalysisProgress({
  step,
  compact = false,
  light = false,
}: {
  step: number;
  compact?: boolean;
  light?: boolean;
}) {
  const total = ANALYSIS_STEPS.length;
  const index = Math.min(Math.max(step, 0), total - 1);
  const label = ANALYSIS_STEPS[index]?.label ?? 'Working…';
  const fillColor = light ? colors.cream : colors.forest;
  const trackBg = light ? 'rgba(243,238,228,0.22)' : colors.creamDark;
  const labelColor = light ? 'text-cream' : 'text-ink';

  const fraction = useSharedValue(targetFraction(index, total));
  const pulse = useSharedValue(0.88);

  useEffect(() => {
    fraction.value = withTiming(targetFraction(index, total), {
      duration: 520,
      easing: Easing.out(Easing.cubic),
    });
  }, [fraction, index, total]);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [pulse]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fraction.value * 100}%`,
    opacity: pulse.value,
    backgroundColor: fillColor,
  }));

  return (
    <View>
      <Animated.View key={label} entering={FadeIn.duration(240)}>
        <Text className={`text-[16px] font-semibold ${labelColor}`}>{label}…</Text>
      </Animated.View>
      <View
        className="mt-3 h-[5px] overflow-hidden rounded-full"
        style={{ backgroundColor: trackBg }}
      >
        <Animated.View className="h-full rounded-full" style={fillStyle} />
      </View>
      {compact ? null : (
        <Text className={`mt-3 text-[13px] leading-5 ${light ? 'text-cream/70' : 'text-muted'}`}>
          This can take a moment. You can leave and we’ll finish on Home.
        </Text>
      )}
    </View>
  );
}

function targetFraction(index: number, total: number): number {
  if (index >= total - 1) return 0.92;
  return (index + 0.42) / total;
}
