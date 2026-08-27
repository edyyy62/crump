import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ScanIngredient } from '../types';
import { LevelBadge } from './LevelBadge';
import { colors } from '../theme';
import { sentenceCaseName } from '../domain/names';
import { Animated, enter } from '../lib/motion';

export function IngredientRow({
  ingredient,
  nested = false,
  index = 0,
  onPress,
}: {
  ingredient: ScanIngredient;
  nested?: boolean;
  index?: number;
  onPress: () => void;
}) {
  return (
    <Animated.View entering={enter(index)}>
      <Pressable onPress={onPress} className="flex-row items-center bg-cream px-4 py-3.5">
        {nested ? <View className="mr-3 h-5 w-0.5 rounded-full bg-forest/25" /> : null}
        <View className="min-w-0 flex-1 justify-center pr-3">
          <Text className="text-[16px] font-medium leading-5 text-ink" numberOfLines={2}>
            {sentenceCaseName(ingredient.canonicalName)}
          </Text>
          {ingredient.eNumber ? (
            <Text className="mt-0.5 text-[12px] font-semibold tracking-wide text-forest">
              {ingredient.eNumber}
            </Text>
          ) : null}
        </View>
        <LevelBadge level={ingredient.level} />
        <Ionicons name="chevron-forward" size={16} color={colors.muted} style={{ marginLeft: 8 }} />
      </Pressable>
    </Animated.View>
  );
}
