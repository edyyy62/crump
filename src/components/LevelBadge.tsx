import { Text, View } from 'react-native';
import type { Level } from '../types';
import { LEVEL_LABELS } from '../domain/level';

const solid: Record<Level, string> = {
  organic: 'bg-organic',
  low: 'bg-low',
  moderate: 'bg-moderate',
  high: 'bg-high',
};

export function LevelBadge({ level, compact = false }: { level: Level; compact?: boolean }) {
  return (
    <View className={`self-start rounded-full ${solid[level]} ${compact ? 'px-2 py-0.5' : 'px-2.5 py-1'}`}>
      <Text className={`font-semibold uppercase tracking-wide text-white ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
        {LEVEL_LABELS[level]}
      </Text>
    </View>
  );
}
