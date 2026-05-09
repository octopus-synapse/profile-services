import type { FlagDefinition } from '../../domain/types';

export const NOTIFICATIONS_FLAGS = [
  {
    key: 'notifications',
    name: 'Notificações',
    description: 'Central de notificações do usuário',
    defaultEnabled: true,
    dependsOn: [],
  },
  {
    key: 'notifications.email',
    name: 'Email',
    description: 'Notificações transacionais por email',
    defaultEnabled: true,
    dependsOn: ['notifications'],
  },
  {
    key: 'notifications.push',
    name: 'Web Push',
    description: 'Push notifications no navegador (beta)',
    defaultEnabled: false,
    dependsOn: ['notifications'],
  },
  {
    key: 'notifications.digest',
    name: 'Resumo semanal',
    description: 'Digest semanal de vagas e atividade',
    defaultEnabled: true,
    dependsOn: ['notifications.email'],
  },
] as const satisfies readonly FlagDefinition[];
