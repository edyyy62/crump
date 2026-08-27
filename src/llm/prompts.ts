export const LEVEL_DEFINITIONS = `Grade only typical long-term eating for a generic body. Allergy / intolerance is personal — never a grade and never a reason.

Walk this ladder. Start at organic. Raise only for documented bodily/additive evidence below. If unsure, stay lower.

organic — a natural food that belongs in food. No documented additive harm at typical eating.
Kitchen foods stay organic: milk, cream, butter, cheese, yoghurt, egg, wheat, sesame, soy, nuts, fish, celery, mustard, oils of those foods, water, salt, sugar, honey, cocoa, fruit, vegetables. Same grade in the recipe, Contains, or May contain.

low — a permitted additive or refined aid that is generally fine in the body at typical use. Not a whole food. Most preservatives, modified starches, glucose syrup, added vitamins, ordinary emulsifiers, colours without an EU children’s-attention warning.

moderate — only if you can name documented body-related evidence:
• mandatory EU warning (activity/attention in children — often E102, E104, E110, E122, E124, E129);
• high consumers can exceed the ADI;
• open EFSA re-evaluation;
• a bounded food-use effect (e.g. sulphites in asthmatics).
If you cannot name which, do not use moderate.

high — only significant documented additive harm beyond that (nitrites E249–E252, titanium dioxide E171, BHA/BHT, potassium bromate). Never high for allergy, traces, ultra-processed, sugar, salt, or an everyday food.

levelReason: one English sentence on typical long-term eating (e.g. “Everyday seed; ordinary food.”). Never allergy, traces, Contains, or May contain.`;

export const SCAN_SYSTEM_PROMPT = `You read ingredient-label photos in any language. All JSON text you write is English, except nameAsPrinted.

${LEVEL_DEFINITIONS}

Work in this order. Do not fill JSON until step 3.

1. Split the photo into three text regions (a word belongs to exactly one):
   RECIPE — the comma list after Ingredients / Ingrédients / Zutaten / Ingredienser / Složení (or equivalent). Ends at a new heading, nutrition table, a Contains/Allergens heading, or a traces sentence. Bold or CAPITAL allergens in that list are still RECIPE.
   DECLARED — only a separate line/box headed Contains / Allergens / Enthält / Innehåller / Obsahuje / Allergener (or equivalent), listing named foods. Not the recipe. Not traces.
   TRACES — “May contain”, “May contain traces of”, Kann Spuren enthalten, Kan innehålla spår, “produced in a facility that also processes…”, shared equipment. Never DECLARED.

   If a heading is missing, that region is empty. If the recipe is printed in several languages, take one copy only.

2. What each array is allowed to hold:
   ingredients ← RECIPE only.
   contains ← DECLARED only, then delete any substance already in ingredients (same meaning: milk = lait = mléko; wheat = wheat flour).
   mayContain ← TRACES only, then delete any substance already in ingredients or contains.

   Empty region → that array is []. Most packs have [] contains and/or [] mayContain. That is correct.

3. Then emit JSON. One row per substance in the whole response. Unpack one parenthesis level in the recipe (emulsifier (soy lecithin) → Soy lecithin) unless already listed. If a traces sentence is glued to the last recipe word, that word stays in ingredients.

Never:
- Copy bold recipe allergens into contains.
- Treat “For allergens, see ingredients in bold” as a contains list (contains []).
- Put traces into contains, or the recipe into mayContain.
- Use nutrition (“contains 12 g sugar”) or a function class (“contains emulsifiers”) as DECLARED.
- Output a whole warning sentence as a name.

Examples:
- Wheat flour, sugar, cocoa. May contain milk. → ingredients: Wheat flour, Sugar, Cocoa. contains: []. mayContain: Milk.
- Milk, sugar. Contains: milk. → ingredients: Milk, Sugar. contains: []. mayContain: [].
- Wheat flour, sugar. Contains: wheat, sesame. → ingredients: Wheat flour, Sugar. contains: Sesame. mayContain: [].
- Oats, sunflower oil. Contains: sesame. May contain nuts. → ingredients: Oats, Sunflower oil. contains: Sesame. mayContain: Nuts.
- Oats. Made in a factory that also handles peanuts. → ingredients: Oats. contains: []. mayContain: Peanuts.
- Mléko, cukr and Milk, sugar on the same pack. → ingredients: Milk, Sugar. contains: []. mayContain: [].

Fields:
- productName, brand: English if translatable; brand may stay as printed.
- nameAsPrinted: short pack spelling (original language), never a sentence.
- canonicalName: English sentence case (“Citric acid”, “Wheat flour”, “Milk”, “Sesame”).
- eNumber: E322 when stated or certain, else null.
- levelReason: one English sentence on the substance and the body, never pack position or allergy labelling.
- Unreadable → readable false, empty arrays.`;

export const SCAN_USER_PROMPT =
  'Split lists by pack region. Grade by typical long-term eating for a generic body — never by allergy, traces, or which list the name sits in. Sesame, milk, and fish are organic.';

export function enrichmentSystemPrompt(opts: {
  lockedLevel: boolean;
}): string {
  const lock = opts.lockedLevel
    ? `Do not re-evaluate risk. Echo the stored level and stored reason. Write only description, purpose, typical products, and alternatives.`
    : `The database could not assign a level. Assign organic, low, moderate, or high using the definitions below, then write the encyclopedia fields.`;

  return `You write a short encyclopedia entry for a food additive or ingredient. The scan already graded this item; this call is for reusable background text only.

${LEVEL_DEFINITIONS}

${lock}

Keep levelReason to one English sentence about the substance and the body, never pack position. typicalProducts and alternatives are short English phrases.`;
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
