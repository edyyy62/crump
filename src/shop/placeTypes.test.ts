import { describe, expect, it } from 'vitest';
import {
  defaultEnabledPlaceTypes,
  normalizeEnabledPlaceTypes,
  PLACE_TYPES,
  sortByFavorite,
  toggleEnabledPlaceType,
} from './placeTypes';

describe('PLACE_TYPES', () => {
  it('defaults to grocery and lists extra place types', () => {
    expect(PLACE_TYPES.map((type) => type.id)).toEqual([
      'grocery',
      'gas',
      'pharmacy',
      'bakery',
    ]);
    expect(defaultEnabledPlaceTypes()).toEqual(['grocery']);
  });
});

describe('normalizeEnabledPlaceTypes', () => {
  it('uses catalog defaults when the saved value is missing', () => {
    expect(normalizeEnabledPlaceTypes(undefined)).toEqual(['grocery']);
  });

  it('keeps known ids and drops unknown ones', () => {
    expect(normalizeEnabledPlaceTypes(['spa', 'pharmacy'])).toEqual(['pharmacy']);
    expect(normalizeEnabledPlaceTypes(['grocery', 'gas'])).toEqual(['grocery', 'gas']);
  });
});

describe('toggleEnabledPlaceType', () => {
  it('adds and removes a catalog type without inventing unknown ids', () => {
    expect(toggleEnabledPlaceType(['grocery'], 'grocery')).toEqual([]);
    expect(toggleEnabledPlaceType([], 'grocery')).toEqual(['grocery']);
  });
});

describe('sortByFavorite', () => {
  it('keeps starred places first without changing distance order within each group', () => {
    const rows = [
      { id: 'near', meters: 100 },
      { id: 'mid', meters: 300 },
      { id: 'far', meters: 800 },
    ];
    expect(sortByFavorite(rows, ['far', 'mid']).map((row) => row.id)).toEqual([
      'mid',
      'far',
      'near',
    ]);
  });

  it('puts an unstarred place back into distance order', () => {
    const rows = [
      { id: 'far', meters: 800 },
      { id: 'near', meters: 100 },
      { id: 'mid', meters: 300 },
    ];
    expect(sortByFavorite(rows, []).map((row) => row.id)).toEqual(['near', 'mid', 'far']);
  });
});
