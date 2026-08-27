import { describe, expect, it } from 'vitest';
import { dedupeMayContain, dedupeParsedIngredients, listedCanonicalNames, listedIdentities } from './dedupe';
import type { ScanIngredientParsed } from '../llm/schemas';

function item(
  canonicalName: string,
  extra?: Partial<ScanIngredientParsed>,
): ScanIngredientParsed {
  return {
    nameAsPrinted: canonicalName,
    canonicalName,
    eNumber: null,
    level: 'low',
    levelReason: 'test',
    subIngredients: [],
    ...extra,
  };
}

describe('dedupeParsedIngredients', () => {
  it('keeps the first listing of a repeated name', () => {
    const out = dedupeParsedIngredients([item('sugar'), item('salt'), item('Sugar')]);
    expect(out.map((row) => row.canonicalName)).toEqual(['sugar', 'salt']);
  });

  it('treats the same E-number as one ingredient', () => {
    const out = dedupeParsedIngredients([
      item('plain caramel', { eNumber: 'E150d' }),
      item('colour', {
        eNumber: 'E150D',
        subIngredients: [
          {
            nameAsPrinted: 'caramel',
            canonicalName: 'sulphite ammonia caramel',
            eNumber: 'E150d',
            level: 'moderate',
            levelReason: 'ADI',
          },
        ],
      }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.subIngredients).toHaveLength(0);
  });

  it('keeps nested subs that are new, skips those already listed', () => {
    const out = dedupeParsedIngredients([
      item('sugar'),
      item('chocolate', {
        subIngredients: [
          {
            nameAsPrinted: 'sugar',
            canonicalName: 'sugar',
            eNumber: null,
            level: 'low',
            levelReason: 'sweetener',
          },
          {
            nameAsPrinted: 'cocoa',
            canonicalName: 'cocoa mass',
            eNumber: null,
            level: 'organic',
            levelReason: 'food',
          },
        ],
      }),
    ]);
    expect(out.map((row) => row.canonicalName)).toEqual(['sugar', 'chocolate']);
    expect(out[1]?.subIngredients.map((row) => row.canonicalName)).toEqual(['cocoa mass']);
  });

  it('drops may-contain items already listed as ingredients', () => {
    const listed = dedupeParsedIngredients([item('milk'), item('sugar')]);
    const traces = dedupeMayContain(
      [
        {
          nameAsPrinted: 'milk',
          canonicalName: 'Milk',
          eNumber: null,
          level: 'organic',
          levelReason: 'traces',
        },
        {
          nameAsPrinted: 'almonds',
          canonicalName: 'almonds',
          eNumber: null,
          level: 'organic',
          levelReason: 'traces',
        },
      ],
      listedIdentities(listed),
    );
    expect(traces.map((row) => row.canonicalName)).toEqual(['almonds']);
  });

  it('drops contains items already covered by the recipe', () => {
    const listed = dedupeParsedIngredients([item('wheat flour'), item('sugar')]);
    const declared = dedupeMayContain(
      [
        {
          nameAsPrinted: 'wheat',
          canonicalName: 'Wheat',
          eNumber: null,
          level: 'organic',
          levelReason: 'allergen',
        },
        {
          nameAsPrinted: 'sesame',
          canonicalName: 'Sesame',
          eNumber: null,
          level: 'organic',
          levelReason: 'allergen',
        },
      ],
      listedIdentities(listed),
      listedCanonicalNames(listed),
    );
    expect(declared.map((row) => row.canonicalName)).toEqual(['Sesame']);
  });
});
