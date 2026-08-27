import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

const GHOST_ROWS = [
  { name: 'Spring water', grade: 'Organic', tint: colors.organic },
  { name: 'Citric acid', grade: 'Low', tint: colors.low },
  { name: 'Phosphoric acid', grade: 'Moderate', tint: colors.moderate },
  { name: 'Sodium nitrite', grade: 'High', tint: colors.high },
] as const;

export function EmptyHistory({
  onImport,
}: {
  onImport: () => void;
}) {
  return (
    <View className="flex-1 justify-center pb-4 pt-2">
      <View className="rounded-[24px] bg-cream px-5 pb-5 pt-5">
        <Text className="text-[12px] font-semibold uppercase tracking-[3px] text-forest">
          First scan
        </Text>
        <Text className="mt-3 text-[26px] font-semibold leading-8 text-ink">
          Photograph the ingredients list.
        </Text>
        <Text className="mt-2 text-[15px] leading-6 text-muted">
          Crump reads the label, grades each additive, and keeps the scan here.
        </Text>

        <View className="mt-5 overflow-hidden rounded-[18px] bg-page px-4 py-2">
          {GHOST_ROWS.map((row, i) => (
            <View
              key={row.name}
              className={`flex-row items-center py-2.5 ${
                i < GHOST_ROWS.length - 1 ? 'border-b border-cream-dark/80' : ''
              }`}
            >
              <Text className="min-w-0 flex-1 text-[15px] text-ink">{row.name}</Text>
              <Text
                className="text-[11px] font-semibold"
                style={{ color: row.tint }}
              >
                {row.grade}
              </Text>
            </View>
          ))}
        </View>

        <View className="mt-5 gap-2.5">
          <Step n="1" text="Frame the printed list so the type is sharp." />
          <Step n="2" text="Let AI read and grade what’s on the pack." />
          <Step n="3" text="Open any scan later — grades stay as they were." />
        </View>

        <Pressable onPress={onImport} className="mt-5 self-start">
          <Text className="text-[14px] font-semibold text-forest">Or import a photo from your library</Text>
        </Pressable>
      </View>

      <View className="mt-7 items-center">
        <Ionicons name="arrow-down" size={20} color={colors.forest} />
        <Text className="mt-1 text-[12px] font-semibold uppercase tracking-widest text-forest">
          Scan label
        </Text>
      </View>
    </View>
  );
}

function Step({ n, text }: { n: string; text: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-6 w-6 items-center justify-center rounded-full bg-forest">
        <Text className="text-[12px] font-semibold text-cream">{n}</Text>
      </View>
      <Text className="flex-1 text-[14px] leading-5 text-ink">{text}</Text>
    </View>
  );
}
