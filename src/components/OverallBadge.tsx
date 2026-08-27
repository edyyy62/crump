import { Text, View } from 'react-native';
import type { Level } from '../types';
import { LEVEL_LABELS, formatCountSummary } from '../domain/level';

const solid: Record<Level, string> = {
  organic: 'bg-organic',
  low: 'bg-low',
  moderate: 'bg-moderate',
  high: 'bg-high',
};

export function OverallBadge({
  level,
  counts,
  compact = false,
}: {
  level: Level;
  counts: Record<Level, number>;
  compact?: boolean;
}) {
  const summary = formatCountSummary(counts);
  if (compact) {
    return (
      <View className={`items-center justify-center rounded-full px-2.5 py-1 ${solid[level]}`}>
        <Text className="text-[12px] font-semibold text-white">{LEVEL_LABELS[level]}</Text>
      </View>
    );
  }
  return (
    <View className={`rounded-[20px] px-3.5 py-2.5 ${solid[level]}`}>
      <Text className="text-[11px] font-semibold uppercase tracking-widest text-white/80">
        Overall
      </Text>
      <Text className="mt-0.5 text-[22px] font-semibold text-white">{LEVEL_LABELS[level]}</Text>
      {summary ? <Text className="mt-1 text-[12px] text-white/90">{summary}</Text> : null}
    </View>
  );
}
