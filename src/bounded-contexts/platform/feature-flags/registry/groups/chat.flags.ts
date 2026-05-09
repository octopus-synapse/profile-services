import type { FlagDefinition } from '../../domain/types';

export const CHAT_FLAGS = [
  {
    key: 'chat',
    name: 'Chat',
    description: 'Widget de chat e mensagens',
    defaultEnabled: true,
    dependsOn: [],
  },
  {
    key: 'chat.ai-assistant',
    name: 'Assistente IA',
    description: 'Assistente de carreira em linguagem natural',
    defaultEnabled: true,
    dependsOn: ['chat'],
  },
  {
    key: 'chat.realtime',
    name: 'Chat realtime',
    description: 'Mensagens em tempo real via WebSocket (beta)',
    defaultEnabled: false,
    dependsOn: ['chat'],
  },
] as const satisfies readonly FlagDefinition[];
