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
const levelJson = { type: 'string', enum: ['organic', 'low', 'moderate', 'high'] } as const;

const subIngredientJson = {
  type: 'object',
  additionalProperties: false,
  properties: {
    nameAsPrinted: { type: 'string' },
    canonicalName: { type: 'string' },
    eNumber: stringOrNull,
    level: levelJson,
    levelReason: { type: 'string' },
  },
  required: ['nameAsPrinted', 'canonicalName', 'eNumber', 'level', 'levelReason'],
} as const;

export const scanJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    readable: { type: 'boolean' },
    productName: stringOrNull,
    brand: stringOrNull,
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          nameAsPrinted: { type: 'string' },
          canonicalName: { type: 'string' },
          eNumber: stringOrNull,
          level: levelJson,
          levelReason: { type: 'string' },
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
  },
  required: ['readable', 'productName', 'brand', 'ingredients'],
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
