import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ScanIngredient } from '../types';
import { LevelBadge } from './LevelBadge';
import { colors } from '../theme';

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
    <Pressable onPress={onPress} className="flex-row items-center bg-cream px-4 py-3.5">
      <View className={`min-w-0 flex-1 justify-center pr-3 ${nested ? 'pl-5' : ''}`}>
        <Text className="text-[16px] font-medium leading-5 text-ink" numberOfLines={2}>
          {ingredient.canonicalName}
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
  );
}
