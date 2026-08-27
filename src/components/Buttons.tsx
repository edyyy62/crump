import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors } from '../theme';

export function PrimaryButton({
  label,
  onPress,
  disabled,
  tone = 'forest',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'forest' | 'cream';
}) {
  const bg = tone === 'forest' ? 'bg-forest' : 'bg-cream';
  const fg = tone === 'forest' ? 'text-cream' : 'text-forest';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`items-center rounded-full px-6 py-4 ${bg} ${disabled ? 'opacity-50' : ''}`}
    >
      <Text className={`text-[16px] font-semibold ${fg}`}>{label}</Text>
    </Pressable>
  );
}

export function ScreenMessage({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <View className="flex-1 items-center justify-center bg-page px-8">
      <Text className="text-center text-[22px] font-semibold text-ink">{title}</Text>
      {body ? <Text className="mt-3 text-center text-[15px] leading-6 text-muted">{body}</Text> : null}
      <View className="mt-8 w-full gap-3">{children}</View>
    </View>
  );
}

export { colors };
