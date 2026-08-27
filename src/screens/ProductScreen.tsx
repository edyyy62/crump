import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackGlyph } from '../components/Glyphs';
import { getDb } from '../db/database';
import { getScan, listScanIngredients } from '../db/repositories';
import { useScanStore } from '../store/scans';
import { IngredientRow } from '../components/IngredientRow';
import { OverallBadge } from '../components/OverallBadge';
import { formatScanDate } from '../lib/dates';
import { colors } from '../theme';
import type { Scan, ScanIngredient } from '../types';

export function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const rename = useScanStore((s) => s.rename);
  const storeScan = useScanStore((s) => s.scans.find((item) => item.id === id));
  const [scan, setScan] = useState<Scan | null>(storeScan ?? null);
  const [ingredients, setIngredients] = useState<ScanIngredient[]>([]);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    const db = await getDb();
    const next = await getScan(db, id);
    const rows = await listScanIngredients(db, id);
    setScan(next);
    setIngredients(rows);
    if (next) setDraftName(next.productName);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const parents = ingredients.filter((row) => row.parentId === null);
    const children = ingredients.filter((row) => row.parentId !== null);
    return parents.map((parent) => ({
      parent,
      children: children.filter((child) => child.parentId === parent.id),
    }));
  }, [ingredients]);

  if (!scan) {
    return (
      <View className="flex-1 items-center justify-center bg-page">
        <Text className="text-muted">Scan not found.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-page" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-3 py-2">
        <Pressable onPress={() => router.back()} className="p-2">
          <BackGlyph color={colors.forest} />
        </Pressable>
        <Text className="text-[13px] font-semibold uppercase tracking-widest text-forest">
          Product
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <View className="mx-5 mb-4 flex-row rounded-2xl bg-cream p-3">
          <Image
            source={{ uri: scan.photoUri }}
            className="h-24 w-24 rounded-xl bg-cream-dark"
            contentFit="cover"
          />
          <View className="ml-3 min-w-0 flex-1">
            {editing ? (
              <TextInput
                autoFocus
                value={draftName}
                onChangeText={setDraftName}
                onBlur={() => {
                  const next = draftName.trim() || scan.productName;
                  setEditing(false);
                  if (next !== scan.productName) {
                    void rename(scan.id, next);
                    setScan({ ...scan, productName: next });
                  }
                }}
                className="border-b border-forest text-[20px] font-semibold text-ink"
              />
            ) : (
              <Pressable onPress={() => setEditing(true)}>
                <Text className="text-[20px] font-semibold text-ink">{scan.productName}</Text>
                <Text className="mt-0.5 text-[12px] text-muted">Tap to rename</Text>
              </Pressable>
            )}
            {scan.brand ? <Text className="mt-1 text-[14px] text-muted">{scan.brand}</Text> : null}
            <Text className="mt-1 text-[13px] text-muted">{formatScanDate(scan.scannedAt)}</Text>
            <View className="mt-2 self-start">
              <OverallBadge level={scan.overallLevel} counts={scan.counts} />
            </View>
          </View>
        </View>

        <Text className="mb-2 px-5 text-[13px] font-semibold uppercase tracking-widest text-muted">
          Ingredients
        </Text>
        <View className="overflow-hidden rounded-2xl mx-5">
          {grouped.map(({ parent, children }) => (
            <View key={parent.id}>
              <IngredientRow
                ingredient={parent}
                onPress={() => router.push(`/ingredient/${parent.id}`)}
              />
              {children.map((child) => (
                <IngredientRow
                  key={child.id}
                  ingredient={child}
                  nested
                  onPress={() => router.push(`/ingredient/${child.id}`)}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
