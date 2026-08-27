import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackGlyph } from '../components/Glyphs';
import { getDb } from '../db/database';
import { getScanIngredient } from '../db/repositories';
import { enrichIfNeeded, loadAdditiveForIngredient } from '../domain/enrich';
import { isLevel } from '../domain/level';
import { LevelBadge } from '../components/LevelBadge';
import { SkeletonBlock } from '../components/SkeletonBlock';
import { colors, levelHeader } from '../theme';
import type { Additive, ScanIngredient } from '../types';

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
      if (!cancelled) setAdditive(existing);
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

  const headerLevel =
    additive && isLevel(additive.level) ? additive.level : (ingredient?.level ?? 'low');
  const headerColor = levelHeader[headerLevel];
  const canonical = additive?.canonicalName ?? ingredient?.canonicalName ?? '';
  const printed = ingredient?.nameAsPrinted;
  const showPrinted = printed && printed.toLowerCase() !== canonical.toLowerCase();
  const description = additive?.description || null;
  const purpose = additive?.purpose || null;
  const reason = additive?.levelReason || ingredient?.levelReason || '';
  const typical = additive?.typicalProducts;
  const alternatives = additive?.alternatives;

  return (
    <View className="flex-1 bg-page" style={{ paddingTop: insets.top }}>
      <View className="px-3 py-2">
        <Pressable onPress={() => router.back()} className="self-start p-2">
          <BackGlyph color={colors.forest} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View className="mx-5 overflow-hidden rounded-3xl" style={{ backgroundColor: headerColor }}>
          <View className="p-5">
            <Text className="text-[28px] font-semibold leading-8 text-ink">{canonical}</Text>
            {showPrinted ? (
              <Text className="mt-1 text-[14px] italic text-ink/70">as printed: {printed}</Text>
            ) : null}
            <View className="mt-3 flex-row flex-wrap items-center gap-2">
              {ingredient?.eNumber ? (
                <View className="rounded-md bg-white/50 px-2 py-1">
                  <Text className="text-[12px] font-semibold text-forest">{ingredient.eNumber}</Text>
                </View>
              ) : null}
              {additive?.category ? (
                <Text className="text-[13px] capitalize text-ink/70">{additive.category}</Text>
              ) : null}
              {ingredient ? <LevelBadge level={headerLevel} /> : null}
              {ingredient?.source === 'llm' ? (
                <Text className="text-[12px] italic text-ink/70">LLM-judged</Text>
              ) : null}
            </View>
          </View>
        </View>

        <Section title="What it is & purpose">
          {description ? <Text className="text-[16px] leading-6 text-ink">{description}</Text> : null}
          {purpose ? <Text className="mt-2 text-[16px] leading-6 text-ink">{purpose}</Text> : null}
          {!description && !purpose && enriching ? <SkeletonCopy /> : null}
          {!description && !purpose && !enriching ? (
            <Text className="text-[15px] text-muted">No description stored yet.</Text>
          ) : null}
        </Section>

        <Section title="Why this level">
          {reason ? <Text className="text-[16px] leading-6 text-ink">{reason}</Text> : <SkeletonCopy />}
        </Section>

        <Section title="Typical products & alternatives">
          {enriching && !typical ? <SkeletonCopy /> : null}
          {typical && typical.length > 0 ? (
            <Text className="text-[16px] leading-6 text-ink">
              Typical in {typical.join(', ')}.
            </Text>
          ) : null}
          {alternatives && alternatives.length > 0 ? (
            <Text className="mt-2 text-[16px] leading-6 text-ink">
              Alternatives: {alternatives.join(', ')}.
            </Text>
          ) : null}
          {!enriching && !typical && !alternatives ? (
            <Text className="text-[15px] text-muted">No extra detail cached yet.</Text>
          ) : null}
          {offlineNote ? (
            <Text className="mt-3 text-[13px] italic text-muted">More details when online.</Text>
          ) : null}
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mx-5 mt-5 rounded-2xl bg-cream p-4">
      <Text className="mb-2 text-[12px] font-semibold uppercase tracking-widest text-forest">
        {title}
      </Text>
      {children}
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
