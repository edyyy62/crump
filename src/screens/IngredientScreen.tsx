import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDb } from '../db/database';
import { getScanIngredient } from '../db/repositories';
import { enrichIfNeeded, isEnriched, loadAdditiveForIngredient } from '../domain/enrich';
import { LEVEL_HINTS } from '../domain/level';
import { sentenceCaseName } from '../domain/names';
import { LevelBadge } from '../components/LevelBadge';
import { AiMark } from '../components/AiMark';
import { SkeletonBlock } from '../components/SkeletonBlock';
import { colors, levelHeader } from '../theme';
import { Animated, enterSoft } from '../lib/motion';
import { applyNatureGrade } from '../domain/labelGrade';

export function IngredientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [ingredient, setIngredient] = useState<ScanIngredient | null>(null);
  const [additive, setAdditive] = useState<Additive | null>(null);
  const [enriching, setEnriching] = useState(true);
  const [offlineNote, setOfflineNote] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!id) return;
      const row = await getScanIngredient(await getDb(), id);
      if (!row || cancelled) return;
      setIngredient(row);
      const existing = await loadAdditiveForIngredient(row);
      if (cancelled) return;
      setAdditive(existing);
      setEnriching(!isEnriched(existing));
      const result = await enrichIfNeeded(row);
      if (cancelled) return;
      setAdditive(result.additive);
      setOfflineNote(result.offlineNote);
      setEnriching(false);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const headerLevel = ingredient?.level ?? 'low';
  const headerColor = levelHeader[headerLevel];
  const canonical = sentenceCaseName(ingredient?.canonicalName ?? '');
  const printed = ingredient?.nameAsPrinted;
  const showPrinted = printed && printed.toLowerCase() !== canonical.toLowerCase();
  const description = additive?.description || null;
  const purpose = additive?.purpose || null;
  const reason = applyNatureGrade({
    level: headerLevel,
    levelReason: ingredient?.levelReason || additive?.levelReason || '',
  }).levelReason;
  const typical = additive?.typicalProducts;
  const alternatives = additive?.alternatives;
  const aiGraded = ingredient?.source === 'llm';
  const aiCopy = Boolean(additive?.enrichedAt);
  const hasWhere = Boolean(typical?.length || alternatives?.length);
  const hint = LEVEL_HINTS[headerLevel];
  const headerNote =
    showPrinted && printed
      ? `On the pack as ${printed}, ${hint.charAt(0).toLowerCase()}${hint.slice(1)}`
      : hint;

  return (
    <View className="flex-1 bg-page" style={{ paddingTop: insets.top }}>
      <View className="px-3 py-1">
        <Pressable onPress={() => router.back()} className="self-start p-2">
          <Ionicons name="chevron-back" size={26} color={colors.forest} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <View className="mx-5 overflow-hidden rounded-[24px] px-5 pb-5 pt-5" style={{ backgroundColor: headerColor }}>
          <Animated.View entering={enterSoft(0)}>
            <Text className="text-[28px] font-semibold leading-8 text-ink">{canonical}</Text>
            <Text className="mt-2 text-[13px] leading-5 text-ink/70">{headerNote}</Text>
            <View className="mt-2.5 flex-row flex-wrap items-center gap-2">
              {ingredient?.eNumber ? (
                <View className="rounded-full px-2 py-0.5 bg-white/50">
                  <Text className="text-[11px] font-semibold leading-[14px] text-forest">{ingredient.eNumber}</Text>
                </View>
              ) : null}
              {ingredient ? <LevelBadge level={headerLevel} /> : null}
              {aiGraded ? <AiMark label="AI graded" /> : null}
            </View>
          </Animated.View>
        </View>

        <Section title="What it is" index={1} ai={aiCopy && Boolean(description || purpose)}>
          {description ? <Text className="text-[16px] leading-6 text-ink">{description}</Text> : null}
          {purpose ? <Text className="mt-2 text-[16px] leading-6 text-ink">{purpose}</Text> : null}
          {!description && !purpose && enriching ? <SkeletonCopy /> : null}
          {!description && !purpose && !enriching ? (
            <Text className="text-[15px] text-muted">No description stored yet.</Text>
          ) : null}
        </Section>

        <Section title="Why this grade" index={2} ai={aiGraded} aiLabel="AI graded">
          {reason ? (
            <Text className="text-[16px] leading-6 text-ink">{reason}</Text>
          ) : enriching ? (
            <SkeletonCopy />
          ) : (
            <Text className="text-[15px] text-muted">Graded from this scan, with no extra note.</Text>
          )}
        </Section>

        <Section title="Where it shows up" index={3} ai={aiCopy && hasWhere}>
          {enriching && !typical ? <SkeletonCopy /> : null}
          {typical && typical.length > 0 ? (
            <Text className="text-[16px] leading-6 text-ink">Typical in {typical.join(', ')}.</Text>
          ) : null}
          {alternatives && alternatives.length > 0 ? (
            <Text className="mt-2 text-[16px] leading-6 text-ink">
              Often swapped for {alternatives.join(', ')}.
            </Text>
          ) : null}
          {!enriching && !typical?.length && !alternatives?.length ? (
            <Text className="text-[15px] text-muted">No extra detail cached yet.</Text>
          ) : null}
          {offlineNote ? (
            <Text className="mt-3 text-[13px] italic text-muted">
              Couldn’t fetch a description. The grade from this scan is unchanged.
            </Text>
          ) : null}
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  index,
  ai,
  aiLabel = 'AI enhanced',
  children,
}: {
  title: string;
  index: number;
  ai?: boolean;
  aiLabel?: string;
  children: ReactNode;
}) {
  return (
    <View className="mx-5 mt-5">
      <View className="mb-2 flex-row items-center gap-2">
        <Text className="text-[12px] font-semibold uppercase tracking-widest text-forest">{title}</Text>
        {ai ? <AiMark label={aiLabel} /> : null}
      </View>
      <View className="rounded-[22px] bg-cream p-4">
        <Animated.View entering={enterSoft(index)}>{children}</Animated.View>
      </View>
    </View>
  );
}

function SkeletonCopy() {
  return (
    <View className="gap-2">
      <SkeletonBlock className="h-3 w-11/12" />
      <SkeletonBlock className="h-3 w-10/12" />
      <SkeletonBlock className="h-3 w-8/12" />
    </View>
  );
}
