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
}: {
  level: Level;
  counts: Record<Level, number>;
}) {
  const summary = formatCountSummary(counts);
  return (
    <View className={`rounded-2xl px-3 py-2 ${solid[level]}`}>
      <Text className="text-[11px] font-bold uppercase tracking-widest text-white">
        {LEVEL_LABELS[level]}
      </Text>
      {summary ? (
        <Text className="mt-0.5 text-[11px] text-white/90">{summary}</Text>
      ) : null}
    </View>
  );
}
