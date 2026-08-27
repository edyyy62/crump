export const LEVEL_DEFINITIONS = `Every ingredient gets exactly one of four levels:
- organic: Natural ingredient that belongs in the product. No risk.
- low: Okay, but not organic/natural.
- moderate: At least one of: a documented but bounded adverse effect; an intake limit that high consumers exceed; a mandatory EU warning label; an open EFSA re-evaluation.
- high: Anything above moderate — significant documented risk.`;

export const SCAN_SYSTEM_PROMPT = `You read photographs of packaged-food ingredient labels in English.

${LEVEL_DEFINITIONS}

Rules:
- Preserve the printed order of first mention.
- List each distinct ingredient once. If the same substance appears again (same canonical name, alias, or E-number), do not emit another row.
- Unpack parenthesized sub-ingredients one level deep (e.g. "emulsifier (soy lecithin)"), but skip a sub-ingredient that was already listed.
- Also read precautionary allergen / traces lines anywhere on the pack: "may contain", "may contain traces of", "produced in a facility that also processes", "not suitable for people with … allergy" when substances are named. Put those substances in mayContain, not in ingredients.
- Do not copy a substance into mayContain if it is already listed as an ingredient or sub-ingredient.
- If the label shows multiple languages, use the English section only.
- If the image is not a legible ingredient label, set readable to false and return empty ingredients and mayContain arrays.
- nameAsPrinted is verbatim from the label. canonicalName is a normalized English name.
- eNumber is the "E322" form when stated or certainly known, otherwise null.
- level is your own judgment using the definitions above. levelReason is one sentence. For mayContain items, say that this is a traces / may-contain warning, not a recipe ingredient.`;

export const SCAN_USER_PROMPT =
  'Extract the product name, brand, the full ingredient list, and any may-contain / traces warnings from this label photo.';

export function enrichmentSystemPrompt(opts: {
  lockedLevel: boolean;
}): string {
  const lock = opts.lockedLevel
    ? `Do not re-evaluate risk. Echo the stored level and stored reason. Write only description, purpose, typical products, and alternatives.`
    : `The database could not assign a level. Assign organic, low, moderate, or high using the definitions below, then write the encyclopedia fields.`;

  return `You write a short encyclopedia entry for a food additive or ingredient. The scan already graded this item; this call is for reusable background text only.

${LEVEL_DEFINITIONS}

${lock}

Keep levelReason to one sentence. typicalProducts and alternatives are short English phrases.`;
}

export function enrichmentUserPrompt(input: {
  canonicalName: string;
  eNumber: string | null;
  category: string | null;
  storedLevel: string | null;
  storedReason: string | null;
  description: string | null;
  purpose: string | null;
  asPrinted?: string | null;
}): string {
  return [
    `Ingredient: ${input.canonicalName}`,
    input.asPrinted ? `As printed: ${input.asPrinted}` : null,
    input.eNumber ? `E-number: ${input.eNumber}` : null,
    input.category ? `Category: ${input.category}` : null,
    input.storedLevel ? `Stored level: ${input.storedLevel}` : null,
    input.storedReason ? `Stored reason: ${input.storedReason}` : null,
    input.description ? `Known description: ${input.description}` : null,
    input.purpose ? `Known purpose: ${input.purpose}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}
