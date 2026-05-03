import type { FlagDefinition } from '../../domain/types';

export const SCORING_FLAGS = [
  // Root for the scoring subsystem. Individual kill-switches below.
  {
    key: 'scoring',
    name: 'Scoring',
    description: 'Subsistema de scores (Style, Resume Quality, Match, Fit)',
    defaultEnabled: true,
    dependsOn: [],
  },
  {
    key: 'scoring.content-quality.enabled',
    name: 'Content Quality (IA)',
    description: 'Habilita avaliação de qualidade de redação via LLM. Kill-switch global.',
    defaultEnabled: true,
    dependsOn: ['scoring'],
  },
  {
    key: 'scoring.match.semantic.enabled',
    name: 'Match semântico (embeddings)',
    description:
      'Habilita sub-score de similaridade semântica CV↔vaga via embeddings. Kill-switch global.',
    defaultEnabled: true,
    dependsOn: ['scoring'],
  },
  {
    key: 'scoring.match.daily-recommendations',
    name: 'Recomendações a cada 3 dias',
    description: 'Cron que computa top-N matches por user nas áreas de interesse',
    defaultEnabled: false,
    dependsOn: ['scoring'],
  },
  {
    key: 'fit-profile.required-for-standard-user',
    name: 'Fit profile obrigatório (standard user)',
    description:
      'Gate que exige questionário de fit respondido (e válido por 90d) pra ver Match, aplicar em vagas internas, usar AI tailor e auto-apply',
    defaultEnabled: true,
    dependsOn: [],
  },
] as const satisfies readonly FlagDefinition[];
