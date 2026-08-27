export const PLACE_TYPES = [
  { id: 'grocery' as const, label: 'Grocery', defaultEnabled: true },
  { id: 'gas' as const, label: 'Gas station', defaultEnabled: false },
  { id: 'pharmacy' as const, label: 'Pharmacy', defaultEnabled: false },
  { id: 'bakery' as const, label: 'Bakery', defaultEnabled: false },
];

export type PlaceTypeId = (typeof PLACE_TYPES)[number]['id'];

export type PlaceType = {
  id: PlaceTypeId;
  label: string;
  defaultEnabled: boolean;
};

const knownIds = new Set<string>(PLACE_TYPES.map((type) => type.id));

export function defaultEnabledPlaceTypes(): PlaceTypeId[] {
  return PLACE_TYPES.filter((type) => type.defaultEnabled).map((type) => type.id);
}

export function normalizeEnabledPlaceTypes(raw: unknown): PlaceTypeId[] {
  if (!Array.isArray(raw)) return defaultEnabledPlaceTypes();
  const seen = new Set<PlaceTypeId>();
  const ids: PlaceTypeId[] = [];
  for (const value of raw) {
    if (typeof value !== 'string' || !knownIds.has(value) || seen.has(value as PlaceTypeId)) {
      continue;
    }
    const id = value as PlaceTypeId;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export function toggleEnabledPlaceType(
  current: readonly PlaceTypeId[],
  id: PlaceTypeId,
): PlaceTypeId[] {
  if (current.includes(id)) return current.filter((typeId) => typeId !== id);
  return [...current, id];
}

export function enabledTypeSummary(ids: readonly PlaceTypeId[]): string {
  const labels = PLACE_TYPES.filter((type) => ids.includes(type.id)).map((type) => type.label);
  if (labels.length === 0) return 'None';
  if (labels.length === 1) return labels[0] ?? 'None';
  if (labels.length === 2) return labels.join(', ');
  return `${labels[0]} +${labels.length - 1}`;
}

export function sortByFavorite<T extends { id: string; meters: number }>(
  rows: T[],
  favoriteIds: readonly string[],
): T[] {
  const favorites = new Set(favoriteIds);
  return [...rows].sort((left, right) => {
    const favDiff = Number(favorites.has(right.id)) - Number(favorites.has(left.id));
    if (favDiff !== 0) return favDiff;
    return left.meters - right.meters;
  });
}
