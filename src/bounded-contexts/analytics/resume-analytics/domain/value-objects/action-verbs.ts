export const ACTION_VERBS = [
  'led',
  'developed',
  'implemented',
  'managed',
  'created',
  'designed',
  'built',
  'launched',
  'improved',
  'increased',
  'reduced',
  'optimized',
  'delivered',
  'achieved',
  'executed',
  'coordinated',
  'established',
  'transformed',
  'streamlined',
  'spearheaded',
] as const;

export type ActionVerb = (typeof ACTION_VERBS)[number];
