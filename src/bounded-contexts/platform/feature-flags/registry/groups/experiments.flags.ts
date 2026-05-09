import type { FlagDefinition } from '../../domain/types';

export const EXPERIMENTS_FLAGS = [
  {
    key: 'experiments',
    name: 'Experimentos',
    description: 'Flag raiz para testes A/B e features beta',
    defaultEnabled: false,
    dependsOn: [],
  },
  {
    key: 'experiments.onboarding-v2',
    name: 'Onboarding v2',
    description: 'Novo fluxo de onboarding em 3 passos',
    defaultEnabled: false,
    dependsOn: ['experiments'],
  },
  {
    key: 'experiments.pricing-ab',
    name: 'Pricing A/B',
    description: 'Teste de copy na página de pricing',
    defaultEnabled: false,
    dependsOn: ['experiments'],
  },
] as const satisfies readonly FlagDefinition[];
