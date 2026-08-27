import { Text, View } from 'react-native';
import { ArrowDownGlyph } from './Glyphs';
import { colors } from '../theme';

export function EmptyHistory() {
  return (
    <View className="mt-10 items-center px-8">
      <Text className="text-center text-[16px] leading-6 text-muted">
        Photograph a label to grade every ingredient.
      </Text>
      <View className="mt-6 items-center">
        <ArrowDownGlyph color={colors.forest} />
      </View>
    </View>
  );
}
