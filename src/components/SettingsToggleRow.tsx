import type { ReactNode } from 'react';
import { ActivityIndicator, Switch, Text, View } from 'react-native';
import { colors } from '../theme';

export function SettingsToggleRow({
  title,
  body,
  value,
  busy,
  onToggle,
  footer,
}: {
  title: string;
  body?: string;
  value: boolean;
  busy?: boolean;
  onToggle: () => void;
  footer?: ReactNode;
}) {
  return (
    <View className="px-4 py-3">
      <View className={`flex-row ${body ? 'items-start' : 'items-center'}`}>
        <View className="min-w-0 flex-1 pr-3">
          <Text className="text-[16px] font-semibold text-ink">{title}</Text>
          {body ? <Text className="mt-1 text-[13px] leading-5 text-muted">{body}</Text> : null}
        </View>
        <View className="justify-center">
          {busy ? (
            <ActivityIndicator color={colors.forest} />
          ) : (
            <Switch
              value={value}
              onValueChange={onToggle}
              trackColor={{ false: colors.creamDark, true: colors.organicSoft }}
              thumbColor={value ? colors.forest : colors.muted}
            />
          )}
        </View>
      </View>
      {footer}
    </View>
  );
}
