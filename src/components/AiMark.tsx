import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

export function AiMark({
  label,
  light = false,
}: {
  label?: string;
  light?: boolean;
}) {
  const icon = light ? colors.cream : colors.forest;
  const text = light ? 'text-cream' : 'text-forest';
  const bg = light ? 'bg-white/20' : 'bg-forest/10';
  return (
    <View className={`flex-row items-center self-start rounded-full ${label ? 'gap-1 px-2 py-[3px]' : 'p-1.5'} ${bg}`}>
      <Ionicons name="sparkles" size={11} color={icon} />
      {label ? (
        <Text className={`text-[10px] font-semibold tracking-wide ${text}`}>{label}</Text>
      ) : null}
    </View>
  );
}
