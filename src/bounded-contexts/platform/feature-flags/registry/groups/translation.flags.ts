import type { FlagDefinition } from '../../domain/types';

/**
 * Bilingual profiles (ADR-003 §9).
 *
 * `translation.enabled` is the global kill-switch, mirroring
 * `scoring.content-quality.enabled`: the surfaces that consume it degrade to
 * monolingual rather than erroring, and the direct `POST /v1/translation/*`
 * endpoints — which are an explicit request to spend an LLM call — refuse
 * outright via the `feature-flag` route guard.
 */
export const TRANSLATION_FLAGS = [
  {
    key: 'translation',
    name: 'Tradução',
    description: 'Subsistema de tradução por LLM (perfis bilíngues).',
    defaultEnabled: true,
    dependsOn: [],
  },
  {
    key: 'translation.enabled',
    name: 'Tradução por LLM',
    description:
      'Habilita tradução de conteúdo de currículo via LLM. Kill-switch global — desligado, o produto degrada para monolíngue.',
    defaultEnabled: true,
    dependsOn: ['translation'],
  },
] as const satisfies readonly FlagDefinition[];
