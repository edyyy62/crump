import { View } from 'react-native';

export function SkeletonBlock({ className }: { className?: string }) {
  return <View className={`rounded-xl bg-cream-dark ${className ?? 'h-4 w-full'}`} />;
}
