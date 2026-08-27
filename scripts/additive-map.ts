import type { Level } from '../src/types';

export const HIGH_E_NUMBERS = new Set([
  'E171',
  'E249',
  'E250',
  'E251',
  'E252',
  'E320',
  'E321',
  'E924',
  'E924A',
  'E924B',
]);

export const WARNING_LABEL_E_NUMBERS = new Set([
  'E102',
  'E104',
  'E110',
  'E122',
  'E124',
  'E129',
]);

export const ORGANIC_E_NUMBERS = new Set([
  'E100',
  'E101',
  'E140',
  'E160A',
  'E160C',
  'E160D',
  'E162',
  'E163',
  'E170',
  'E296',
  'E300',
  'E306',
  'E330',
  'E331',
  'E333',
  'E334',
  'E335',
  'E336',
  'E337',
  'E375',
  'E392',
  'E406',
  'E410',
  'E412',
  'E414',
  'E415',
  'E440',
  'E460',
  'E500',
  'E501',
  'E503',
  'E508',
  'E509',
  'E516',
  'E901',
  'E903',
  'E904',
  'E941',
  'E948',
  'E968',
]);

export const LOW_E_NUMBERS = new Set([
  'E200',
  'E202',
  'E203',
  'E270',
  'E280',
  'E281',
  'E282',
  'E283',
  'E290',
  'E297',
  'E301',
  'E302',
  'E304',
  'E307',
  'E322',
  'E325',
  'E326',
  'E327',
  'E332',
  'E385',
  'E401',
  'E410',
  'E415',
  'E418',
  'E420',
  'E421',
  'E422',
  'E433',
  'E450',
  'E451',
  'E452',
  'E460',
  'E461',
  'E464',
  'E466',
  'E471',
  'E472E',
  'E475',
  'E476',
  'E481',
  'E491',
  'E621',
  'E627',
  'E631',
  'E635',
  'E950',
  'E955',
  'E965',
]);

export const MODERATE_E_NUMBERS = new Set([
  'E150C',
  'E150D',
  'E211',
  'E212',
  'E213',
  'E220',
  'E221',
  'E222',
  'E223',
  'E224',
  'E228',
  'E249',
  'E310',
  'E311',
  'E312',
  'E338',
  'E339',
  'E340',
  'E341',
  'E407',
  'E407A',
  'E432',
  'E433',
  'E434',
  'E435',
  'E436',
  'E951',
  'E952',
  'E954',
  'E955',
  'E960',
  'E961',
]);

const ORGANIC_NAME_HINTS = [
  'pectin',
  'ascorbic',
  'citric acid',
  'tocopherol',
  'carotene',
  'anthocyanin',
  'beetroot',
  'chlorophyll',
  'locust bean',
  'guar gum',
  'gum arabic',
  'xanthan',
  'agar',
  'beeswax',
  'carnauba',
  'carbon dioxide',
  'nitrogen',
  'oxygen',
  'sodium bicarbonate',
  'potassium carbonate',
];

export function normalizeENumber(value: string | null | undefined): string | null {
  if (!value) return null;
  const compact = value.toUpperCase().replace(/[\s-]/g, '');
  const match = compact.match(/^E?(\d{3,4}[A-Z]?)$/);
  if (!match) return null;
  return `E${match[1]}`;
}

export function textFromLangMap(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.en === 'string') return record.en;
    const first = Object.values(record).find((item) => typeof item === 'string');
    if (typeof first === 'string') return first;
  }
  return '';
}

export function listFromLangMap(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  const text = textFromLangMap(value);
  if (!text) return [];
  return text
    .split(/,|;|\|/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function extractENumber(key: string, entry: Record<string, unknown>): string | null {
  const direct =
    normalizeENumber(textFromLangMap(entry.e_number)) ??
    normalizeENumber(textFromLangMap(entry.eNumber));
  if (direct) return direct;
  const fromKey = key.match(/e(\d{3,4}[a-z]?)/i);
  if (fromKey) return normalizeENumber(`E${fromKey[1]}`);
  const name = textFromLangMap(entry.name);
  const fromName = name.match(/\bE[\s-]?(\d{3,4}[A-Za-z]?)\b/i);
  if (fromName) return normalizeENumber(`E${fromName[1]}`);
  return null;
}

export function flattenStrings(value: unknown, into: string[] = []): string[] {
  if (typeof value === 'string') {
    into.push(value);
    return into;
  }
  if (Array.isArray(value)) {
    for (const item of value) flattenStrings(item, into);
    return into;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) {
      flattenStrings(item, into);
    }
  }
  return into;
}

export interface MappingEvidence {
  eNumber: string | null;
  name: string;
  category: string;
  texts: string[];
}

export function collectEvidence(key: string, entry: Record<string, unknown>): MappingEvidence {
  const eNumber = extractENumber(key, entry);
  const name = textFromLangMap(entry.name).replace(/^E\d{3,4}[A-Z]?\s*[-–:]?\s*/i, '') || key;
  const classes = [
    ...listFromLangMap(entry.additives_classes),
    ...listFromLangMap(entry.parents),
  ];
  const category =
    classes
      .map((item) => item.replace(/^en:/, '').replace(/-/g, ' '))
      .find(Boolean) ?? 'additive';
  const texts = flattenStrings(entry).map((item) => item.toLowerCase());
  return { eNumber, name, category, texts };
}

export function mapLevel(evidence: MappingEvidence): {
  level: Level | 'unknown';
  reason: string;
  confident: boolean;
} {
  const eNumber = evidence.eNumber;
  const blob = evidence.texts.join(' ');
  const name = evidence.name.toLowerCase();

  if (eNumber && HIGH_E_NUMBERS.has(eNumber)) {
    return {
      level: 'high',
      reason: 'Significant documented risk beyond a bounded additive effect (EU restriction, nitrosamines, or IARC concern).',
      confident: true,
    };
  }

  const warningLabel =
    (eNumber && WARNING_LABEL_E_NUMBERS.has(eNumber)) ||
    blob.includes('may have an adverse effect on activity and attention in children') ||
    blob.includes('attention of children');
  const adiExceeded =
    blob.includes('exceed') && blob.includes('adi');
  const reevaluation =
    blob.includes('re-evaluat') || blob.includes('reevaluat') || blob.includes('under evaluation');
  const boundedAdverse =
    blob.includes('hypersensit') || blob.includes('intolerance') || blob.includes('asthma');

  if (warningLabel || adiExceeded || reevaluation || boundedAdverse || (eNumber && MODERATE_E_NUMBERS.has(eNumber))) {
    return {
      level: 'moderate',
      reason: warningLabel
        ? 'Mandatory EU warning label for possible effects on activity and attention in children.'
        : adiExceeded
          ? 'High consumers may exceed the acceptable daily intake.'
          : reevaluation
            ? 'Open EFSA re-evaluation or unresolved safety review.'
            : 'Documented but bounded adverse effect at food-use levels.',
      confident: true,
    };
  }

  const looksOrganic =
    (eNumber && ORGANIC_E_NUMBERS.has(eNumber)) ||
    ORGANIC_NAME_HINTS.some((hint) => name.includes(hint)) ||
    blob.includes('en:natural') ||
    evidence.category.includes('natural');

  if (looksOrganic && eNumber && !MODERATE_E_NUMBERS.has(eNumber) && !HIGH_E_NUMBERS.has(eNumber)) {
    return {
      level: 'organic',
      reason: 'Natural ingredient that belongs in food; no meaningful additive risk at typical use.',
      confident: true,
    };
  }

  if (eNumber && LOW_E_NUMBERS.has(eNumber)) {
    return {
      level: 'low',
      reason: 'Evaluated as safe at typical use; not a natural whole ingredient.',
      confident: true,
    };
  }

  const evaluatedSafe =
    blob.includes('evaluated as safe') ||
    blob.includes('no safety concern') ||
    blob.includes('adi ') ||
    blob.includes('acceptable daily intake');

  if (eNumber && evaluatedSafe) {
    return {
      level: 'low',
      reason: 'Evaluated as safe at typical use; not a natural whole ingredient.',
      confident: true,
    };
  }

  if (eNumber && !looksOrganic) {
    return {
      level: 'low',
      reason: 'Permitted food additive without a mapped warning, ADI-exceedance, or high-risk classification.',
      confident: false,
    };
  }

  return {
    level: 'unknown',
    reason: '',
    confident: false,
  };
}
