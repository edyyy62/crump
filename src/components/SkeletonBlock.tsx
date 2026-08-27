import { useEffect } from 'react';
import { View } from 'react-native';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Animated } from '../lib/motion';

export function SkeletonBlock({ className }: { className?: string }) {
  const pulse = useSharedValue(0.55);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse]);

  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return <Animated.View style={style} className={`rounded-xl bg-cream-dark ${className ?? 'h-4 w-full'}`} />;
}

export function ShopRowSkeleton({ bordered = false }: { bordered?: boolean }) {
  return (
    <View className={`flex-row items-center px-4 py-3.5 ${bordered ? 'border-t border-cream-dark/80' : ''}`}>
      <SkeletonBlock className="h-4 w-7/12" />
      <View className="flex-1" />
      <SkeletonBlock className="h-3 w-12" />
    </View>
  );
}
