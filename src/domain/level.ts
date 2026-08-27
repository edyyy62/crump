import type { Level } from '../types';

export const LEVEL_ORDER: Record<Level, number> = {
  organic: 0,
  low: 1,
  moderate: 2,
  high: 3,
};

export const LEVEL_LABELS: Record<Level, string> = {
  organic: 'Organic',
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
};

export const LEVEL_HINTS: Record<Level, string> = {
  organic: 'A natural ingredient that belongs in food.',
  low: 'Processed, but generally fine at typical use.',
  moderate: 'Worth limiting if you eat a lot of it.',
  high: 'The one to be most careful with.',
};

export function isLevel(value: string): value is Level {
  return value === 'organic' || value === 'low' || value === 'moderate' || value === 'high';
}

export function worseLevel(a: Level, b: Level): Level {
  return LEVEL_ORDER[a] >= LEVEL_ORDER[b] ? a : b;
}

export const EMPTY_COUNTS: Record<Level, number> = {
  organic: 0,
  low: 0,
  moderate: 0,
  high: 0,
};

export function formatCountSummary(counts: Record<Level, number>): string {
  const parts: string[] = [];
  for (const level of ['organic', 'low', 'moderate', 'high'] as const) {
    if (counts[level] > 0) {
      parts.push(`${counts[level]} ${LEVEL_LABELS[level].toLowerCase()}`);
    }
  }
  return parts.join(' · ');
}
