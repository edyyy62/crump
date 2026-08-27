import { describe, expect, it } from 'vitest';
import { applyNatureGrade, mentionForDeclared } from './labelGrade';

describe('applyNatureGrade', () => {
  it('ignores a traces/allergy reason and does not keep high', () => {
    const fish = applyNatureGrade({
      level: 'high',
      levelReason: 'It is a trace/may contain warning',
    });
    const sesame = applyNatureGrade({
      level: 'high',
      levelReason: 'This cis a traces warning for potential alergens',
    });
    expect(fish.level).toBe('organic');
    expect(sesame.level).toBe('organic');
    expect(fish.levelReason.toLowerCase()).not.toMatch(/trace|may contain/);
    expect(sesame.levelReason.toLowerCase()).not.toMatch(/trace|alergen/);
  });

  it('keeps a body-impact additive grade', () => {
    const out = applyNatureGrade({
      level: 'high',
      levelReason: 'Nitrosamine risk in cured meat.',
    });
    expect(out.level).toBe('high');
    expect(out.levelReason).toBe('Nitrosamine risk in cured meat.');
  });
});

describe('mentionForDeclared', () => {
  it('moves a contains row to may_contain when the wording is traces', () => {
    expect(
      mentionForDeclared({
        nameAsPrinted: 'milk',
        levelReason: 'It is a trace/may contain warning',
      }),
    ).toBe('may_contain');
  });

  it('keeps a Contains line as contains when the wording is not traces', () => {
    expect(
      mentionForDeclared({
        nameAsPrinted: 'sesame',
        levelReason: 'Everyday seed; natural food.',
      }),
    ).toBe('contains');
  });
});
