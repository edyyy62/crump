import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Additive, SeedFile } from '../src/types';
import {
  collectEvidence,
  listFromLangMap,
  mapLevel,
  normalizeENumber,
  textFromLangMap,
} from './additive-map';

const TAXONOMY_URLS = [
  'https://world.openfoodfacts.org/data/taxonomies/additives.json',
  'https://static.openfoodfacts.org/data/taxonomies/additives.json',
];

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEED_PATH = join(ROOT, 'assets/seed/additives.json');
const REPORT_PATH = join(ROOT, 'assets/seed/mapping-report.md');

async function downloadTaxonomy(): Promise<Record<string, Record<string, unknown>>> {
  let lastError: unknown;
  for (const url of TAXONOMY_URLS) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Crump/1.0 (personal seed builder; ingredient label app)',
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        lastError = new Error(`${url} -> ${response.status}`);
        continue;
      }
      return (await response.json()) as Record<string, Record<string, unknown>>;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Failed to download additives taxonomy');
}

function aliasesOf(entry: Record<string, unknown>, canonical: string): string[] {
  const names = new Set<string>();
  const nameMap = entry.name;
  if (nameMap && typeof nameMap === 'object') {
    for (const value of Object.values(nameMap as Record<string, unknown>)) {
      if (typeof value === 'string') names.add(value.replace(/^E\d{3,4}[A-Z]?\s*[-–:]?\s*/i, '').trim());
    }
  }
  for (const syn of listFromLangMap(entry.synonyms)) names.add(syn);
  for (const syn of listFromLangMap(entry.children)) names.add(syn.replace(/^en:/, '').replace(/-/g, ' '));
  names.delete(canonical);
  names.delete('');
  return [...names].slice(0, 24);
}

function descriptionOf(entry: Record<string, unknown>): string {
  return (
    textFromLangMap(entry.description) ||
    textFromLangMap(entry.wiktionary) ||
    ''
  );
}

export function buildSeed(taxonomy: Record<string, Record<string, unknown>>): {
  seed: SeedFile;
  unknowns: { id: string; name: string; eNumber: string | null; fields: string[] }[];
} {
  const additives: Additive[] = [];
  const unknowns: { id: string; name: string; eNumber: string | null; fields: string[] }[] = [];
  const seen = new Set<string>();

  for (const [key, entry] of Object.entries(taxonomy)) {
    if (!entry || typeof entry !== 'object') continue;
    const evidence = collectEvidence(key, entry);
    if (!evidence.eNumber) continue;
    const id = key.startsWith('en:') ? key : `en:${evidence.eNumber.toLowerCase()}`;
    if (seen.has(evidence.eNumber)) continue;
    seen.add(evidence.eNumber);

    const mapped = mapLevel(evidence);
    const canonicalName =
      evidence.name.replace(/^E\d{3,4}[A-Z]?\s*[-–:]?\s*/i, '').trim() || evidence.eNumber;

    const level = mapped.confident ? mapped.level : mapped.level === 'low' ? 'unknown' : mapped.level;
    const additive: Additive = {
      id,
      canonicalName,
      aliases: aliasesOf(entry, canonicalName),
      eNumber: normalizeENumber(evidence.eNumber),
      category: evidence.category,
      level: level === 'low' && !mapped.confident ? 'unknown' : level,
      levelSource: mapped.confident && level !== 'unknown' ? 'source-data' : null,
      levelReason: mapped.confident ? mapped.reason : '',
      description: descriptionOf(entry),
      purpose: evidence.category ? `Used as a ${evidence.category}.` : '',
      enrichedAt: null,
      typicalProducts: null,
      alternatives: null,
    };

    if (additive.level === 'unknown') {
      additive.levelSource = null;
      additive.levelReason = '';
      unknowns.push({
        id: additive.id,
        name: additive.canonicalName,
        eNumber: additive.eNumber,
        fields: Object.keys(entry).sort(),
      });
    }

    additives.push(additive);
  }

  additives.sort((a, b) => (a.eNumber ?? '').localeCompare(b.eNumber ?? '', 'en', { numeric: true }));
  return { seed: { version: 2, additives }, unknowns };
}

function reportMarkdown(
  unknowns: { id: string; name: string; eNumber: string | null; fields: string[] }[],
  total: number,
): string {
  const lines = [
    '# Additive mapping report',
    '',
    `Generated from the Open Food Facts additives taxonomy. ${total} E-numbered entries imported; ${unknowns.length} could not be assigned a confident level and are stored as \`unknown\` for lazy LLM resolution.`,
    '',
    '| E-number | Name | Taxonomy fields |',
    '| --- | --- | --- |',
  ];
  for (const row of unknowns) {
    lines.push(`| ${row.eNumber ?? ''} | ${row.name.replace(/\|/g, '/')} | ${row.fields.join(', ')} |`);
  }
  lines.push('');
  return lines.join('\n');
}

async function main() {
  console.log('Downloading Open Food Facts additives taxonomy…');
  const taxonomy = await downloadTaxonomy();
  const { seed, unknowns } = buildSeed(taxonomy);
  writeFileSync(SEED_PATH, `${JSON.stringify(seed, null, 2)}\n`);
  writeFileSync(REPORT_PATH, reportMarkdown(unknowns, seed.additives.length));
  console.log(`Wrote ${seed.additives.length} additives to ${SEED_PATH}`);
  console.log(`Unknown/unmapped: ${unknowns.length} (see ${REPORT_PATH})`);
}

if (process.argv[1]?.includes('build-additive-db')) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
