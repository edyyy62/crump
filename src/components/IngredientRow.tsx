import { Pressable, Text, View } from 'react-native';
import type { ScanIngredient } from '../types';
import { LevelBadge } from './LevelBadge';

export function IngredientRow({
  ingredient,
  nested = false,
  onPress,
}: {
  ingredient: ScanIngredient;
  nested?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center border-b border-cream-dark bg-cream px-4 py-3.5 ${nested ? 'pl-10' : ''}`}
    >
      <View className="mr-3 h-2 w-2 rounded-full bg-forest/30" />
      <View className="min-w-0 flex-1 pr-3">
        <Text className="text-[16px] font-medium text-ink" numberOfLines={2}>
          {ingredient.canonicalName}
        </Text>
        <View className="mt-1 flex-row flex-wrap items-center gap-1.5">
          {ingredient.eNumber ? (
            <View className="rounded-md bg-chip px-1.5 py-0.5">
              <Text className="text-[11px] font-semibold tracking-wide text-forest">
                {ingredient.eNumber}
              </Text>
            </View>
          ) : null}
          {ingredient.source === 'llm' ? (
            <Text className="text-[11px] italic text-muted">LLM-judged</Text>
          ) : null}
        </View>
      </View>
      <LevelBadge level={ingredient.level} compact />
    </Pressable>
  );
}
