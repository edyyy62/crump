import type { IngredientMention, Level } from '../types';

const NATURE_REASON =
  'Typical long-term eating for a general diet — personal sensitivity is not part of this grade.';

export function isLabellingReason(value: string): boolean {
  const text = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return /allerg|alerg|may contain|traces?\b|trace warning|potential (food )?allerg|shared (equipment|facilit)|factory that also|not (in )?the recipe|contains line|pack heading/.test(
    text,
  );
}

export function mentionForDeclared(item: {
  nameAsPrinted: string;
  levelReason: string;
}): Extract<IngredientMention, 'contains' | 'may_contain'> {
  const blob = `${item.nameAsPrinted} ${item.levelReason}`.toLowerCase();
  return /may contain|traces?\b|shared (equipment|facilit)|factory that also/.test(blob)
    ? 'may_contain'
    : 'contains';
}

/**
 * Pack position never sets the grade. If the model raised a grade because of
 * Contains / May contain / allergy, drop that and keep the ladder default
 * (organic) so matcher/DB can still apply real additive evidence.
 */
export function applyNatureGrade(item: { level: Level; levelReason: string }): {
  level: Level;
  levelReason: string;
} {
  if (!isLabellingReason(item.levelReason)) {
    return { level: item.level, levelReason: item.levelReason };
  }
  return { level: 'organic', levelReason: NATURE_REASON };
}
