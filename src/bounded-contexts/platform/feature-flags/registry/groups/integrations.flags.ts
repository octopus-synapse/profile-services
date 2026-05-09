import type { FlagDefinition } from '../../domain/types';

export const INTEGRATIONS_FLAGS = [
  {
    key: 'integrations',
    name: 'Integrações',
    description: 'Integrações com serviços externos',
    defaultEnabled: true,
    dependsOn: [],
  },
  {
    key: 'integrations.linkedin',
    name: 'LinkedIn',
    description: 'OAuth LinkedIn para importação de perfil',
    defaultEnabled: true,
    dependsOn: ['integrations'],
  },
  {
    key: 'integrations.gmail',
    name: 'Gmail',
    description: 'Leitura de emails de recrutadores (opt-in)',
    defaultEnabled: false,
    dependsOn: ['integrations'],
  },
  {
    key: 'integrations.calendar',
    name: 'Google Calendar',
    description: 'Sincroniza entrevistas com o calendário',
    defaultEnabled: false,
    dependsOn: ['integrations'],
  },
] as const satisfies readonly FlagDefinition[];
