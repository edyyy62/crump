import Constants from 'expo-constants';

const DEFAULT_MODEL = 'gpt-5-mini';

type Extra = {
  openaiApiKey?: string;
  openaiModel?: string;
};

export function extraConfig(): Extra {
  const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
  // Last native extra snapshot can lag Metro; the live model lives in client.ts.
  return {
    openaiApiKey: extra.openaiApiKey || '',
    openaiModel: DEFAULT_MODEL,
  };
}

export function hasOpenAiKey(): boolean {
  return Boolean(extraConfig().openaiApiKey);
}
