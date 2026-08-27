import { describe, expect, it } from 'vitest';
import { enrichmentResponseSchema, scanResponseSchema } from './schemas';

describe('scanResponseSchema', () => {
  it('accepts a readable label with nested sub-ingredients', () => {
    const parsed = scanResponseSchema.parse({
      readable: true,
      productName: 'Cola',
      brand: 'Acme',
      ingredients: [
        {
          nameAsPrinted: 'carbonated water',
          canonicalName: 'carbonated water',
          eNumber: null,
          level: 'organic',
          levelReason: 'Water',
          subIngredients: [],
        },
        {
          nameAsPrinted: 'colour (plain caramel)',
          canonicalName: 'plain caramel',
          eNumber: 'E150d',
          level: 'moderate',
          levelReason: 'ADI',
          subIngredients: [
            {
              nameAsPrinted: 'plain caramel',
              canonicalName: 'sulphite ammonia caramel',
              eNumber: 'E150d',
              level: 'moderate',
              levelReason: 'ADI',
            },
          ],
        },
      ],
    });
    expect(parsed.ingredients).toHaveLength(2);
    expect(parsed.ingredients[1]?.subIngredients).toHaveLength(1);
  });

  it('rejects an invalid level', () => {
    const result = scanResponseSchema.safeParse({
      readable: true,
      productName: null,
      brand: null,
      ingredients: [
        {
          nameAsPrinted: 'x',
          canonicalName: 'x',
          eNumber: null,
          level: 'safe',
          levelReason: 'no',
          subIngredients: [],
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe('enrichmentResponseSchema', () => {
  it('requires typical products and alternatives arrays', () => {
    const parsed = enrichmentResponseSchema.parse({
      level: 'low',
      levelReason: 'Evaluated as safe within typical use.',
      description: 'An emulsifier.',
      purpose: 'Keeps oil and water mixed.',
      typicalProducts: ['chocolate'],
      alternatives: ['egg yolk'],
    });
    expect(parsed.typicalProducts).toEqual(['chocolate']);
  });
});
