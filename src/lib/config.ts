import Constants from 'expo-constants';

const DEFAULT_MODEL = 'gpt-4o-mini';

type Extra = {
  openaiApiKey?: string;
  openaiModel?: string;
};

export function extraConfig(): Extra {
  const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
  // Do not read extra.openaiModel: the native binary still has gpt-5-mini from
  // the last Xcode build, and a Metro reload cannot change that snapshot.
  return {
    openaiApiKey: extra.openaiApiKey || '',
    openaiModel: DEFAULT_MODEL,
  };
}

export function hasOpenAiKey(): boolean {
  return Boolean(extraConfig().openaiApiKey);
}
