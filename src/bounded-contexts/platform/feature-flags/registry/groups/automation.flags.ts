import type { FlagDefinition } from '../../domain/types';

/**
 * Background automation (auto-apply + weekly-curated).
 *
 * `automation.enabled` gates the BullMQ *consumers* (`BcWorkerBinding.enabledWhen`),
 * not the routes: with the flag off the workers boot inert, so a tick can
 * never apply to a job on someone's behalf. Off by default — it went live
 * unregistered for months and nobody opted in; turning it on is a deliberate
 * admin action.
 */
export const AUTOMATION_FLAGS = [
  {
    key: 'automation',
    name: 'Automação',
    description: 'Candidaturas automáticas e seleção semanal curada.',
    defaultEnabled: false,
    dependsOn: [],
  },
  {
    key: 'automation.enabled',
    name: 'Workers de automação',
    description:
      'Habilita os consumidores das filas auto-apply e weekly-curated. Desligado, os workers sobem inertes e nada é candidatado automaticamente.',
    defaultEnabled: false,
    dependsOn: ['automation'],
  },
] as const satisfies readonly FlagDefinition[];

/** Key the automation BC's `BcWorkerBinding.enabledWhen` points at. */
export const AUTOMATION_ENABLED_FLAG_KEY = 'automation.enabled';
