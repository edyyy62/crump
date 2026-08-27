export const LEVELS = ['organic', 'low', 'moderate', 'high'] as const;
export type Level = (typeof LEVELS)[number];

export type IngredientSource = 'database' | 'llm';

export interface Scan {
  id: string;
  productName: string;
  brand: string | null;
  photoUri: string;
  scannedAt: number;
  overallLevel: Level;
  counts: Record<Level, number>;
}

export interface ScanIngredient {
  id: string;
  scanId: string;
  position: number;
  parentId: string | null;
  nameAsPrinted: string;
  canonicalName: string;
  eNumber: string | null;
  level: Level;
  source: IngredientSource;
  levelReason: string;
  additiveId: string | null;
}

export interface Additive {
  id: string;
  canonicalName: string;
  aliases: string[];
  eNumber: string | null;
  category: string;
  level: Level | 'unknown';
  levelSource: 'source-data' | 'llm' | null;
  levelReason: string;
  description: string;
  purpose: string;
  enrichedAt: number | null;
  typicalProducts: string[] | null;
  alternatives: string[] | null;
}

export interface SeedFile {
  version: number;
  additives: Additive[];
}
