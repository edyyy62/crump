import Constants from 'expo-constants';
import {
  enrichmentJsonSchema,
  enrichmentResponseSchema,
  scanJsonSchema,
  scanResponseSchema,
  type EnrichmentResponse,
  type ScanResponse,
} from './schemas';
import {
  enrichmentSystemPrompt,
  enrichmentUserPrompt,
  SCAN_SYSTEM_PROMPT,
  SCAN_USER_PROMPT,
} from './prompts';
import type { Additive, Level } from '../types';
import { isLevel } from '../domain/level';

export class LlmError extends Error {
  constructor(
    message: string,
    readonly kind: 'network' | 'api' | 'schema',
  ) {
    super(message);
    this.name = 'LlmError';
  }
}

type Extra = {
  openaiApiKey?: string;
  openaiModel?: string;
};

function extra(): Extra {
  return (Constants.expoConfig?.extra ?? {}) as Extra;
}

function config() {
  const { openaiApiKey, openaiModel } = extra();
  // Personal-use round 1: the API key ships on-device via extra. Move this
  // call behind a proxy before any public distribution.
  if (!openaiApiKey) {
    throw new LlmError('Missing OPENAI_API_KEY. Add it to .env.', 'api');
  }
  return {
    apiKey: openaiApiKey,
    model: openaiModel || 'gpt-5-mini',
  };
}

async function chatCompletion(body: Record<string, unknown>): Promise<unknown> {
  const { apiKey } = config();
  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new LlmError('Could not reach the analysis service', 'network');
  }

  if (!response.ok) {
    throw new LlmError(`Analysis service returned ${response.status}`, 'api');
  }

  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new LlmError('Empty model response', 'schema');
  }
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new LlmError('Model returned non-JSON', 'schema');
  }
}

async function completeValidated<T>(
  body: Record<string, unknown>,
  parse: (data: unknown) => T,
): Promise<T> {
  const { model } = config();
  const payload = { model, ...body };
  try {
    return parse(await chatCompletion(payload));
  } catch (error) {
    if (error instanceof LlmError && error.kind === 'schema') {
      return parse(await chatCompletion(payload));
    }
    throw error;
  }
}

function parseScan(data: unknown): ScanResponse {
  const result = scanResponseSchema.safeParse(data);
  if (!result.success) {
    throw new LlmError('Scan response failed schema validation', 'schema');
  }
  return result.data;
}

function parseEnrichment(data: unknown): EnrichmentResponse {
  const result = enrichmentResponseSchema.safeParse(data);
  if (!result.success) {
    throw new LlmError('Enrichment response failed schema validation', 'schema');
  }
  return result.data;
}

export async function analyzeLabel(imageBase64: string): Promise<ScanResponse> {
  return completeValidated(
    {
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'scan_label',
          strict: true,
          schema: scanJsonSchema,
        },
      },
      messages: [
        { role: 'system', content: SCAN_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: SCAN_USER_PROMPT },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
            },
          ],
        },
      ],
    },
    parseScan,
  );
}

export async function enrichIngredient(input: {
  canonicalName: string;
  eNumber: string | null;
  category: string | null;
  storedLevel: Level | 'unknown' | null;
  storedReason: string | null;
  description: string | null;
  purpose: string | null;
  asPrinted?: string | null;
}): Promise<EnrichmentResponse> {
  const locked = input.storedLevel !== null && isLevel(input.storedLevel);
  const parsed = await completeValidated(
    {
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'ingredient_enrichment',
          strict: true,
          schema: enrichmentJsonSchema,
        },
      },
      messages: [
        { role: 'system', content: enrichmentSystemPrompt({ lockedLevel: locked }) },
        { role: 'user', content: enrichmentUserPrompt(input) },
      ],
    },
    parseEnrichment,
  );

  if (locked && parsed.level !== input.storedLevel) {
    return { ...parsed, level: input.storedLevel as Level };
  }
  return parsed;
}
