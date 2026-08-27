import { z } from 'zod';

export const levelSchema = z.enum(['organic', 'low', 'moderate', 'high']);

const printedIngredientFields = {
  nameAsPrinted: z.string(),
  canonicalName: z.string(),
  eNumber: z.string().nullable(),
  level: levelSchema,
  levelReason: z.string(),
};

export const subIngredientSchema = z.object(printedIngredientFields);

export const scanIngredientSchema = z.object({
  ...printedIngredientFields,
  subIngredients: z.array(subIngredientSchema),
});

export const scanResponseSchema = z.object({
  readable: z.boolean(),
  productName: z.string().nullable(),
  brand: z.string().nullable(),
  ingredients: z.array(scanIngredientSchema),
  contains: z.array(subIngredientSchema),
  mayContain: z.array(subIngredientSchema),
});

export type ScanResponse = z.infer<typeof scanResponseSchema>;
export type ScanIngredientParsed = z.infer<typeof scanIngredientSchema>;

export const enrichmentResponseSchema = z.object({
  level: levelSchema,
  levelReason: z.string(),
  description: z.string(),
  purpose: z.string(),
  typicalProducts: z.array(z.string()),
  alternatives: z.array(z.string()),
});

export type EnrichmentResponse = z.infer<typeof enrichmentResponseSchema>;

const stringOrNull = { type: ['string', 'null'] } as const;
const levelJson = {
  type: 'string',
  enum: ['organic', 'low', 'moderate', 'high'],
  description:
    'Grade typical long-term eating for a generic body. Ignore allergy, traces, and pack list. organic = kitchen food (sesame, milk, fish, wheat). Never high because someone might be allergic.',
} as const;

const subIngredientJson = {
  type: 'object',
  additionalProperties: false,
  properties: {
    nameAsPrinted: { type: 'string', description: 'Short pack spelling in the original language. Not a whole Contains/May contain sentence.' },
    canonicalName: { type: 'string', description: 'Always English sentence case (Milk, Sesame, Citric acid). Translate; do not leave lait/sesam/mléko here.' },
    eNumber: stringOrNull,
    level: levelJson,
    levelReason: {
      type: 'string',
      description:
        'One English sentence on the substance and the body. Never recipe / Contains / May contain / traces / allergy labelling.',
    },
  },
  required: ['nameAsPrinted', 'canonicalName', 'eNumber', 'level', 'levelReason'],
} as const;

export const scanJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    readable: { type: 'boolean' },
    productName: { type: ['string', 'null'], description: 'English product name when you can tell; otherwise as printed.' },
    brand: { type: ['string', 'null'], description: 'Brand as printed, or English if the pack only has a local word.' },
    ingredients: {
      type: 'array',
      description:
        'Recipe list only. Stop before Contains/Allergens and before any may-contain/traces sentence. Bold allergens in the recipe stay here, not in contains.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          nameAsPrinted: { type: 'string', description: 'Short pack spelling in the original language.' },
          canonicalName: { type: 'string', description: 'Always English sentence case. Translate; one name per substance.' },
          eNumber: stringOrNull,
          level: levelJson,
          levelReason: {
            type: 'string',
            description: 'One English sentence about the substance, not about allergen or traces labelling.',
          },
          subIngredients: { type: 'array', items: subIngredientJson },
        },
        required: [
          'nameAsPrinted',
          'canonicalName',
          'eNumber',
          'level',
          'levelReason',
          'subIngredients',
        ],
      },
    },
    contains: {
      type: 'array',
      description:
        'Only the separate Contains/Allergens heading. Empty if that heading is missing. Never bold recipe names, never traces, never a substance already in ingredients.',
      items: subIngredientJson,
    },
    mayContain: {
      type: 'array',
      description:
        'Only may-contain / traces / shared-facility wording. Empty if none. Never the recipe or the Contains heading. Never a substance already in ingredients or contains.',
      items: subIngredientJson,
    },
  },
  required: ['readable', 'productName', 'brand', 'ingredients', 'contains', 'mayContain'],
} as const;

export const enrichmentJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    level: levelJson,
    levelReason: { type: 'string' },
    description: { type: 'string' },
    purpose: { type: 'string' },
    typicalProducts: { type: 'array', items: { type: 'string' } },
    alternatives: { type: 'array', items: { type: 'string' } },
  },
  required: ['level', 'levelReason', 'description', 'purpose', 'typicalProducts', 'alternatives'],
} as const;
