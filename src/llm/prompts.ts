export const LEVEL_DEFINITIONS = `Every ingredient gets exactly one of four levels:
- organic: Natural ingredient that belongs in the product. No risk.
- low: Okay, but not organic/natural.
- moderate: At least one of: a documented but bounded adverse effect; an intake limit that high consumers exceed; a mandatory EU warning label; an open EFSA re-evaluation.
- high: Anything above moderate — significant documented risk.`;

export const SCAN_SYSTEM_PROMPT = `You read photographs of packaged-food ingredient labels in English.

${LEVEL_DEFINITIONS}

Rules:
- Preserve the printed order of ingredients.
- Unpack parenthesized sub-ingredients one level deep (e.g. "emulsifier (soy lecithin)").
- If the label shows multiple languages, use the English section only.
- If the image is not a legible ingredient label, set readable to false and return an empty ingredients array.
- nameAsPrinted is verbatim from the label. canonicalName is a normalized English name.
- eNumber is the "E322" form when stated or certainly known, otherwise null.
- level is your own judgment using the definitions above. levelReason is one sentence.`;

export const SCAN_USER_PROMPT = 'Extract the product name, brand, and full ingredient list from this label photo.';

export function enrichmentSystemPrompt(opts: {
  lockedLevel: boolean;
}): string {
  const lock = opts.lockedLevel
    ? `The database already assigned a concrete risk level. Expand description, purpose, typical products, and alternatives. Return that same level. If you would choose a different level, discard your level and keep the database level.`
    : `The database could not assign a level. Assign organic, low, moderate, or high using the definitions below.`;

  return `You enrich a food additive or ingredient for a personal label-scanning app.

${LEVEL_DEFINITIONS}

${lock}

Keep levelReason to one sentence naming the criterion that was hit. typicalProducts and alternatives are short English phrases.`;
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
