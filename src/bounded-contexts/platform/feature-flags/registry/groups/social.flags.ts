import type { FlagDefinition } from '../../domain/types';

export const SOCIAL_FLAGS = [
  {
    key: 'social',
    name: 'Social',
    description: 'Rede social interna: feed, conexões, interações',
    defaultEnabled: true,
    dependsOn: [],
  },
  {
    key: 'social.feed',
    name: 'Feed',
    description: 'Feed de publicações da rede',
    defaultEnabled: true,
    dependsOn: ['social'],
  },
  {
    key: 'social.network',
    name: 'Minha Rede',
    description: 'Gestão de conexões e convites',
    defaultEnabled: true,
    dependsOn: ['social'],
  },
  {
    key: 'social.polls',
    name: 'Enquetes',
    description: 'Publicações com enquete',
    defaultEnabled: true,
    dependsOn: ['social.feed'],
  },
  {
    key: 'social.reactions',
    name: 'Reações',
    description: 'Reações em publicações do feed',
    defaultEnabled: true,
    dependsOn: ['social.feed'],
  },
] as const satisfies readonly FlagDefinition[];
