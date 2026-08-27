import type { Level } from '../types';
import { EMPTY_COUNTS, worseLevel } from './level';

export function rollup(ingredients: { level: Level }[]): {
  overallLevel: Level;
  counts: Record<Level, number>;
} {
  const counts: Record<Level, number> = { ...EMPTY_COUNTS };
  let overallLevel: Level = 'organic';
  for (const ingredient of ingredients) {
    counts[ingredient.level] += 1;
    overallLevel = worseLevel(overallLevel, ingredient.level);
  }
  return { overallLevel, counts };
}
