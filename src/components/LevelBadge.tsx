import { Text, View } from 'react-native';
import type { Level } from '../types';
import { LEVEL_LABELS } from '../domain/level';

const solid: Record<Level, string> = {
  organic: 'bg-organic',
  low: 'bg-low',
  moderate: 'bg-moderate',
  high: 'bg-high',
};

export function LevelBadge({ level }: { level: Level; compact?: boolean; small?: boolean }) {
  return (
    <View className={`rounded-full px-2 py-0.5 ${solid[level]}`}>
      <Text className="text-[11px] font-semibold leading-[14px] text-white">{LEVEL_LABELS[level]}</Text>
    </View>
  );
}
