import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDb } from '../db/database';
import { getScan, listScanIngredients } from '../db/repositories';
import { useScanStore } from '../store/scans';
import { IngredientRow } from '../components/IngredientRow';
import { OverallBadge } from '../components/OverallBadge';
import { formatScanDate } from '../lib/dates';
import { colors } from '../theme';
import { Animated, enterFade } from '../lib/motion';
import type { Scan, ScanIngredient } from '../types';

export function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const rename = useScanStore((s) => s.rename);
  const remove = useScanStore((s) => s.remove);
  const storeScan = useScanStore((s) => s.scans.find((item) => item.id === id));
  const [scan, setScan] = useState<Scan | null>(storeScan ?? null);
  const [ingredients, setIngredients] = useState<ScanIngredient[]>([]);
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [loading, setLoading] = useState(!storeScan);

  const load = useCallback(async () => {
    if (!id) return;
    const db = await getDb();
    const next = await getScan(db, id);
    const rows = await listScanIngredients(db, id);
    setScan(next);
    setIngredients(rows);
    if (next) setDraftName(next.productName);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const listed = ingredients.filter((row) => row.mention === 'listed');
    const contains = ingredients.filter((row) => row.mention === 'contains');
    const traces = ingredients.filter((row) => row.mention === 'may_contain');
    const parents = listed.filter((row) => row.parentId === null);
    const children = listed.filter((row) => row.parentId !== null);
    return {
      groups: parents.map((parent) => ({
        parent,
        children: children.filter((child) => child.parentId === parent.id),
      })),
      contains,
      traces,
    };
  }, [ingredients]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-page">
        <Text className="text-muted">Loading…</Text>
      </View>
    );
  }

  if (!scan) {
    return (
      <View className="flex-1 items-center justify-center bg-page">
        <Text className="text-muted">Scan not found.</Text>
      </View>
    );
  }

  const confirmDelete = () => {
    Alert.alert('Delete scan?', 'This removes the photo and every ingredient from this scan.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void remove(scan.id).then(() => router.replace('/'));
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-page" style={{ paddingTop: insets.top }}>
      <View className="z-20 flex-row items-center justify-between px-3 py-1">
        <Pressable onPress={() => router.back()} className="p-2">
          <Ionicons name="chevron-back" size={26} color={colors.forest} />
        </Pressable>
        <View>
          <Pressable onPress={() => setMenuOpen((open) => !open)} className="p-2">
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.forest} />
          </Pressable>
          {menuOpen ? (
            <Animated.View
              entering={enterFade.duration(180)}
              className="absolute right-1 top-11 min-w-[148px] rounded-2xl bg-cream py-1"
              style={{
                shadowColor: colors.forestDeep,
                shadowOpacity: 0.16,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 6 },
                elevation: 8,
              }}
            >
              <Pressable
                onPress={() => {
                  setMenuOpen(false);
                  confirmDelete();
                }}
                className="px-4 py-3"
              >
                <Text className="text-[16px] font-semibold text-high">Delete</Text>
              </Pressable>
            </Animated.View>
          ) : null}
        </View>
      </View>

      {menuOpen ? (
        <Pressable className="absolute inset-0 z-10" onPress={() => setMenuOpen(false)} />
      ) : null}

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 36 }} showsVerticalScrollIndicator={false}>
        <View className="mx-5">
          <Image
            source={{ uri: scan.photoUri }}
            className="h-48 w-full rounded-[24px] bg-cream-dark"
            contentFit="cover"
          />
        </View>

        <View className="mx-5 mt-4 rounded-[24px] bg-cream p-4">
          <Animated.View entering={enterFade}>
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
              className="border-b border-forest text-[22px] font-semibold text-ink"
            />
          ) : (
            <Pressable onPress={() => setEditing(true)}>
              <Text className="text-[22px] font-semibold leading-7 text-ink">{scan.productName}</Text>
            </Pressable>
          )}
          <View className="mt-1.5 flex-row flex-wrap items-center gap-x-2 gap-y-1">
            {scan.brand ? <Text className="text-[14px] text-muted">{scan.brand}</Text> : null}
            <Text className="text-[13px] text-muted">{formatScanDate(scan.scannedAt)}</Text>
          </View>
          <View className="mt-3">
            <OverallBadge level={scan.overallLevel} counts={scan.counts} />
          </View>
        </Animated.View>
        </View>

        <View className="mb-2 mt-7 flex-row items-end justify-between px-5">
          <Text className="text-[13px] font-semibold uppercase tracking-widest text-muted">Ingredients</Text>
          <Text className="text-[13px] text-muted">{grouped.groups.length}</Text>
        </View>
        <View className="mx-5 overflow-hidden rounded-[24px] bg-cream">
          {grouped.groups.map(({ parent, children }, groupIndex) => {
            const index =
              grouped.groups.slice(0, groupIndex).reduce((n, g) => n + 1 + g.children.length, 0);
            return (
              <View key={parent.id} className={groupIndex > 0 ? 'border-t border-cream-dark/80' : ''}>
                <IngredientRow
                  ingredient={parent}
                  index={index}
                  onPress={() => router.push(`/ingredient/${parent.id}`)}
                />
                {children.map((child, childIndex) => (
                  <View key={child.id} className="border-t border-cream-dark/80">
                    <IngredientRow
                      ingredient={child}
                      nested
                      index={index + 1 + childIndex}
                      onPress={() => router.push(`/ingredient/${child.id}`)}
                    />
                  </View>
                ))}
              </View>
            );
          })}
        </View>

        {grouped.contains.length > 0 ? (
          <>
            <View className="mb-2 mt-7 flex-row items-end justify-between px-5">
              <Text className="text-[13px] font-semibold uppercase tracking-widest text-muted">
                Contains
              </Text>
              <Text className="text-[13px] text-muted">{grouped.contains.length}</Text>
            </View>
            <View className="mx-5 overflow-hidden rounded-[24px] bg-cream">
              {grouped.contains.map((row, index) => (
                <View key={row.id} className={index > 0 ? 'border-t border-cream-dark/80' : ''}>
                  <IngredientRow
                    ingredient={row}
                    index={index}
                    onPress={() => router.push(`/ingredient/${row.id}`)}
                  />
                </View>
              ))}
            </View>
          </>
        ) : null}

        {grouped.traces.length > 0 ? (
          <>
            <View className="mb-2 mt-7 flex-row items-end justify-between px-5">
              <Text className="text-[13px] font-semibold uppercase tracking-widest text-muted">
                May contain
              </Text>
              <Text className="text-[13px] text-muted">{grouped.traces.length}</Text>
            </View>
            <View className="mx-5 overflow-hidden rounded-[24px] bg-cream">
              {grouped.traces.map((row, index) => (
                <View key={row.id} className={index > 0 ? 'border-t border-cream-dark/80' : ''}>
                  <IngredientRow
                    ingredient={row}
                    index={index}
                    onPress={() => router.push(`/ingredient/${row.id}`)}
                  />
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
