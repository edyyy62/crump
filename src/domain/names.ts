export function sentenceCaseName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const first = trimmed.charAt(0).toLocaleUpperCase('en-US');
  const rest = trimmed.slice(1);
  const lowerRest = rest === rest.toUpperCase() && /[A-Za-z]/.test(rest) ? rest.toLocaleLowerCase('en-US') : rest;
  return first + lowerRest;
}
