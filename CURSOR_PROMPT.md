# Crump — Build Prompt (Round 1)

You are building **Crump**, a mobile app for scanning product ingredient labels in a store. The user photographs a label; the app converts it into structured ingredient data, grades every ingredient on a 4-level risk scale, and stores the scan in a local history.

Design images for the three screens are attached. Match them precisely — layout, spacing, colors, typography, iconography. For states the designs don't cover (loading, errors, empty history), follow the same visual language.

---

## 1. Tech stack

- **React Native + Expo** (latest SDK), **TypeScript** (strict mode).
- **Expo Router** for navigation (file-based routes).
- **expo-sqlite** for all persistence (scan history + additive database + enrichment cache).
- **expo-camera** for capture, **expo-image-picker** for gallery import.
- **Zustand** for app state.
- **NativeWind** (Tailwind) for styling.
- **OpenAI API** called directly from the app (no backend). Vision-capable model (default `gpt-5-mini`; model id in config so it can be swapped for a flagship model like `gpt-5.5` if label-reading quality needs it). API key from `.env`, exposed via `app.config.ts` → `extra`. Never commit the key; ship a `.env.example`.

This is a personal-use app for round 1. The API key shipping on-device is an accepted tradeoff — add a code comment noting it must move behind a proxy before any public distribution.

## 2. Explicitly OUT of scope (do not build)

- No backend, no user accounts, no cloud sync.
- No barcode scanning or product-database lookup.
- No sharing/export features.
- No localization — **English only**, UI and parsing.
- No settings screen beyond what's needed to run.
- No multi-photo scans (single photo per scan).

## 3. The rating scale (core domain concept)

Every ingredient gets exactly one of four levels:

| Level | Meaning |
|---|---|
| `organic` | Natural ingredient that belongs in the product. No risk. |
| `low` | Okay, but not organic/natural. |
| `moderate` | At least one of: a documented but bounded adverse effect; an intake limit that high consumers exceed; a mandatory EU warning label; an open EFSA re-evaluation. |
| `high` | Anything above `moderate` — significant documented risk. |

Each level has a fixed color/badge per the designs. Use these exact semantics everywhere: LLM prompts, seed-data mapping, UI legend.

**Product-level verdict (rollup):** the product badge takes the level of its **worst** ingredient, displayed together with per-level counts, e.g. a red badge with "2 moderate · 1 high". Show this on history rows and the product detail header.

## 4. Data model

TypeScript types (single source of truth in `src/types.ts`) and matching SQLite tables:

```ts
type Level = 'organic' | 'low' | 'moderate' | 'high';
type IngredientSource = 'database' | 'llm';

interface Scan {
  id: string;              // uuid
  productName: string;     // LLM guess, user-editable
  brand: string | null;
  photoUri: string;        // local file URI of the label photo
  scannedAt: number;       // epoch ms
  overallLevel: Level;     // worst ingredient level
  counts: Record<Level, number>;
}

interface ScanIngredient {
  id: string;
  scanId: string;
  position: number;            // order as printed on the label
  parentId: string | null;     // sub-ingredient nesting, e.g. "emulsifier (soy lecithin)"
  nameAsPrinted: string;
  canonicalName: string;
  eNumber: string | null;      // normalized form "E322"
  level: Level;
  source: IngredientSource;    // 'database' = matched seed DB (authoritative), 'llm' = LLM-judged
  levelReason: string;         // one line: why this level
  additiveId: string | null;   // FK into additives when matched
}

interface Additive {             // seed database row
  id: string;
  canonicalName: string;
  aliases: string[];             // stored as JSON
  eNumber: string | null;
  category: string;              // preservative, colorant, emulsifier, ...
  level: Level | 'unknown';      // 'unknown' = seed data couldn't be mapped; resolved lazily by LLM
  levelSource: 'source-data' | 'llm' | null;  // how the level was assigned; null while 'unknown'
  levelReason: string;
  description: string;           // what it is
  purpose: string;               // why manufacturers use it
  // enrichment cache — null until first fetched:
  enrichedAt: number | null;
  typicalProducts: string[] | null;
  alternatives: string[] | null;
}
```

On first launch, import the bundled seed JSON (`assets/seed/additives.json`, see §8) into the `additives` table; track the seed version so a newer bundled file re-imports.

## 5. LLM contracts

Both calls use OpenAI structured outputs (`response_format: json_schema`, strict). Validate every response against the schema in code (zod); on validation failure retry once automatically, then surface an error state. Put all prompt text in `src/llm/prompts.ts`, the client in `src/llm/client.ts`.

### 5.1 Scan call (vision)

Input: the label photo, downscaled before upload to **max 1024 px longest edge, JPEG ~80 quality** (cost + latency). Output schema:

```jsonc
{
  "readable": true,               // false if the image is not a legible ingredient label
  "productName": "string|null",   // best guess from packaging, null if not visible
  "brand": "string|null",
  "ingredients": [
    {
      "nameAsPrinted": "string",     // verbatim from the label
      "canonicalName": "string",     // normalized English name
      "eNumber": "string|null",      // "E322" form if stated or certainly known
      "level": "organic|low|moderate|high",  // LLM's own judgment per §3 semantics
      "levelReason": "string",       // one sentence
      "subIngredients": [ /* same shape, one level deep */ ]
    }
  ]
}
```

Prompt requirements: include the §3 level definitions verbatim; instruct the model to preserve label order; to unpack parenthesized sub-ingredients; if the label shows multiple languages, use the English section; if `readable` is false, return an empty ingredients array.

### 5.2 Enrichment call (text, lazy)

Fired the **first time** an ingredient's detail page opens and the matched `Additive` row has `enrichedAt = null` (or the ingredient is LLM-judged with no row). Cached in SQLite permanently after. Output schema: `{ level: "organic|low|moderate|high", levelReason, description, purpose, typicalProducts: string[], alternatives: string[] }` — include the §3 level definitions verbatim in the prompt. When the stored level is a concrete `Level`, the prompt passes the DB fields as context and instructs the model to expand, not contradict, that level (discard a contradicting `level` in the response). When the stored level is `'unknown'`, the returned level **resolves** it: persist it to the additive row with `levelSource: 'llm'`, so every future scan and detail view uses it without another call. If offline, show DB content plus a quiet "more details when online" note — never block the page.

## 6. Matching algorithm (hybrid verdicts)

For each ingredient returned by the scan call, resolve the authoritative level in `src/domain/matcher.ts`:

1. Normalize: lowercase, trim, collapse whitespace, strip diacritics.
2. **E-number exact match** against `additives.eNumber` (normalize "E-322", "e322" → "E322").
3. Else **exact match** on `canonicalName`, then on each alias.
4. Else **fuzzy match** on canonicalName/aliases: Levenshtein distance ≤ 2, or one is a prefix of the other with ≥ 5 shared chars. On multiple hits take the lowest distance.
5. **Matched with a concrete level** → use the database `level` and `levelReason`, `source: 'database'` — the DB always wins over the LLM's opinion.
6. **Matched but level is `'unknown'`** → keep the `additiveId` link but use the scan call's `level`/`levelReason` with `source: 'llm'`. (The unknown gets permanently resolved by the enrichment call on first detail open, §5.2 — after that, step 5 applies.)
7. **Unmatched** → keep the LLM's `level`/`levelReason`, `source: 'llm'`. The UI marks all `source: 'llm'` rows with an "LLM-judged" indicator per the designs.

Unit-test this module thoroughly (see §10).

## 7. Screens & flows

Routes: `/` (Home), `/scan` (camera flow), `/product/[id]`, `/ingredient/[id]`.

### 7.1 Home — history + scan entry

- Prominent scan button (per design) → `/scan`; secondary action imports from gallery into the same flow.
- History list, newest first: photo thumbnail, product name, date, overall badge with counts (§3).
- Tap row → product detail. Swipe-to-delete with a confirm; deletes the scan, its ingredients, and its photo file.
- Empty state per the design language: one-line explainer + arrow to the scan button.

### 7.2 Scan flow

States, in order — each visually distinct:

1. **Capture**: camera viewfinder, shutter, gallery button, cancel.
2. **Confirm**: still preview, "Use photo" / "Retake".
3. **Analyzing**: photo dimmed under a progress indicator ("Reading label…"). Not cancellable mid-call.
4. **Result**: navigate to the new product detail.

Errors — each a distinct state with a clear primary action:
- `readable: false` → "Couldn't read an ingredient label in this photo" → Retake.
- No network / API error → "Couldn't reach the analysis service" → Retry (reuses the captured photo) / Cancel.
- Schema-invalid after the automatic retry → treat as API error.

On success, persist scan + ingredients + photo (copied into the app's document directory) in one transaction before navigating.

### 7.3 Product detail — `/product/[id]`

- Header: photo thumbnail, product name (tap to rename inline — persists to DB), brand, scan date, overall badge + counts.
- Ingredient list in label order; sub-ingredients indented under their parent. Each row: name, E-number chip when present, level badge, "LLM-judged" indicator when `source: 'llm'`.
- Tap row → ingredient detail.

### 7.4 Ingredient detail — `/ingredient/[id]`

Sections, DB content as base, LLM-enriched per §5.2:
1. Header: canonical name, "as printed" name if different, E-number, category, level badge.
2. **What it is & purpose.**
3. **Why this level** — the concrete §3 criterion it hit.
4. **Typical products & alternatives.**
Show a skeleton for enriching sections; DB fields render immediately.

## 8. Seed database script

Standalone Node script `scripts/build-additive-db.ts` (run with `npx tsx`, not part of the app bundle):

1. Download the Open Food Facts **additives taxonomy** (https://static.openfoodfacts.org/data/taxonomies/additives.json).
2. For each additive extract: E-number, English canonical name, aliases/synonyms, category (from additive classes), EFSA evaluation fields where present (`efsa_evaluation`, ADI, exposure-exceeds-ADI flags, re-evaluation status).
3. Map to a `Level` using the §3 criteria: mandatory EU warning label / exposure exceeding the ADI for high consumers / open re-evaluation ⇒ `moderate`; documented significant risk beyond that ⇒ `high`; evaluated-safe additives ⇒ `low`; plain natural substances that appear in the taxonomy ⇒ `organic`.
4. Write `assets/seed/additives.json` matching the `Additive` type (enrichment fields null; confidently mapped entries get `levelSource: 'source-data'`), plus `assets/seed/mapping-report.md` listing every entry whose level could not be assigned confidently, with the fields it had — these get `level: 'unknown'` (`levelSource: null`) and are resolved lazily by the LLM on first encounter (§5.2 / §6 step 6).
5. Target coverage: all E-numbered additives in the taxonomy (several hundred). Commit the generated JSON so the app builds without running the script.

## 9. Project structure

```
app/                     # Expo Router routes (thin — screens compose from src/)
  index.tsx  scan.tsx  product/[id].tsx  ingredient/[id].tsx
src/
  components/            # shared UI (LevelBadge, IngredientRow, ScanCard, ...)
  domain/                # matcher.ts, rollup.ts, level.ts (pure, no RN imports)
  llm/                   # client.ts, prompts.ts, schemas.ts (zod)
  db/                    # sqlite setup, migrations, repositories, seed import
  store/                 # zustand stores
  types.ts
scripts/build-additive-db.ts
assets/seed/additives.json
```

Keep `domain/` and `llm/schemas.ts` pure TypeScript with no React Native imports so they're unit-testable in Node.

## 10. Acceptance criteria (definition of done)

- [ ] `npx expo start` runs; app works on a physical phone via Expo Go / dev build.
- [ ] Scanning a clear photo of a soft-drink label yields ≥ 5 ingredients in label order, with E-numbered additives (e.g. E150d, E338) matched from the database (`source: 'database'`).
- [ ] An ingredient absent from the database appears with the LLM's level and the "LLM-judged" indicator.
- [ ] A photo of something that isn't a label produces the "couldn't read" state, not a crash or an empty scan.
- [ ] Airplane mode during analysis produces the retry state; retry after reconnecting succeeds without retaking the photo.
- [ ] History survives app restart; deleting a scan removes its rows and photo file.
- [ ] Renaming a product persists across restarts.
- [ ] Opening an ingredient detail twice makes exactly one enrichment call (verify by logging).
- [ ] An additive seeded with `level: 'unknown'` shows the LLM's scan-time level with the "LLM-judged" indicator; after its detail page is opened once, the resolved level is persisted (`levelSource: 'llm'`) and a fresh scan containing that additive uses it as a database match.
- [ ] Overall badge always equals the worst ingredient level; counts sum to the ingredient count.
- [ ] `domain/matcher.ts` and `domain/rollup.ts` have unit tests covering: E-number normalization variants, alias hits, fuzzy hits, no-match fallback to LLM, DB-beats-LLM on conflict, empty list.
- [ ] All three screens visually match the attached designs.

## 11. Suggested build order

1. Project scaffold, router, types, SQLite setup + seed import (with a small hand-written placeholder seed of ~20 additives).
2. Domain logic + unit tests (matcher, rollup).
3. LLM client + schemas against a fixture response; then live.
4. Scan flow end-to-end with persistence.
5. Home history, product detail, ingredient detail with lazy enrichment.
6. Full seed script and generated database.
7. Error/empty/loading states polish against the designs.
