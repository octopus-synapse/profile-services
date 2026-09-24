import type { FlagDefinition } from '../../domain/types';

export const BILLING_FLAGS = [
  {
    key: 'billing',
    name: 'Cobrança',
    description: 'Módulo de cobrança e assinatura',
    defaultEnabled: true,
    dependsOn: [],
  },
  {
    key: 'billing.early-access-pool',
    name: 'Pool de early access',
    description: 'Cap de 200 usuários com preço travado',
    defaultEnabled: true,
    dependsOn: ['billing'],
  },
  {
    key: 'billing.mercado-pago',
    name: 'Mercado Pago',
    description: 'Integração com Mercado Pago para pagamentos',
    defaultEnabled: true,
    dependsOn: ['billing'],
  },
] as const satisfies readonly FlagDefinition[];
