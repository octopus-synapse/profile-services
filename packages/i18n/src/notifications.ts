/**
 * Notification-template dictionary.
 *
 * One entry per `NotificationType` enum value (from `prisma/schema/enums.prisma`).
 * Templates may carry `{param}` placeholders — the notification sender supplies
 * the params when enqueueing the notification, and the renderer (web/email/push)
 * interpolates at display time using the recipient's preferred locale.
 *
 * Each entry carries BOTH a short `title` and a longer `body`, since most UI
 * surfaces need both (bell dropdown shows title; notification page / email
 * shows body). Keeping them together makes it impossible for one to drift.
 */

import type { Locale, LocalizedMessages } from './types';

export interface NotificationTemplate {
  readonly title: LocalizedMessages;
  readonly body: LocalizedMessages;
  /** Named placeholders the sender must supply. Consumed by tests + docs. */
  readonly params: readonly string[];
}

export type NotificationDictionary = Readonly<Record<string, NotificationTemplate>>;

export const NOTIFICATION_DICTIONARY = {
  POST_LIKED: {
    title: {
      en: '{actorName} liked your post',
      'pt-BR': '{actorName} curtiu seu post',
    },
    body: {
      en: '{actorName} liked your post "{postExcerpt}"',
      'pt-BR': '{actorName} curtiu seu post "{postExcerpt}"',
    },
    params: ['actorName', 'postExcerpt'],
  },
  POST_COMMENTED: {
    title: {
      en: '{actorName} commented on your post',
      'pt-BR': '{actorName} comentou no seu post',
    },
    body: {
      en: '{actorName} commented: "{commentExcerpt}"',
      'pt-BR': '{actorName} comentou: "{commentExcerpt}"',
    },
    params: ['actorName', 'commentExcerpt'],
  },
  POST_REPOSTED: {
    title: {
      en: '{actorName} reposted your post',
      'pt-BR': '{actorName} repostou seu post',
    },
    body: {
      en: '{actorName} reposted "{postExcerpt}"',
      'pt-BR': '{actorName} repostou "{postExcerpt}"',
    },
    params: ['actorName', 'postExcerpt'],
  },
  POST_BOOKMARKED: {
    title: {
      en: '{actorName} saved your post',
      'pt-BR': '{actorName} salvou seu post',
    },
    body: {
      en: '{actorName} bookmarked "{postExcerpt}"',
      'pt-BR': '{actorName} salvou "{postExcerpt}"',
    },
    params: ['actorName', 'postExcerpt'],
  },
  COMMENT_REPLIED: {
    title: {
      en: '{actorName} replied to your comment',
      'pt-BR': '{actorName} respondeu ao seu comentário',
    },
    body: {
      en: '{actorName} replied: "{replyExcerpt}"',
      'pt-BR': '{actorName} respondeu: "{replyExcerpt}"',
    },
    params: ['actorName', 'replyExcerpt'],
  },
  CONNECTION_REQUEST: {
    title: {
      en: '{actorName} wants to connect',
      'pt-BR': '{actorName} quer se conectar',
    },
    body: {
      en: '{actorName} sent you a connection request',
      'pt-BR': '{actorName} enviou um pedido de conexão',
    },
    params: ['actorName'],
  },
  CONNECTION_ACCEPTED: {
    title: {
      en: '{actorName} accepted your connection',
      'pt-BR': '{actorName} aceitou sua conexão',
    },
    body: {
      en: 'You are now connected with {actorName}',
      'pt-BR': 'Você agora está conectado com {actorName}',
    },
    params: ['actorName'],
  },
  FOLLOW_NEW: {
    title: {
      en: '{actorName} started following you',
      'pt-BR': '{actorName} começou a te seguir',
    },
    body: {
      en: '{actorName} is now following you',
      'pt-BR': '{actorName} agora te segue',
    },
    params: ['actorName'],
  },
  SKILL_DECAY: {
    title: {
      en: '"{skillName}" is getting rusty',
      'pt-BR': '"{skillName}" está enferrujando',
    },
    body: {
      en: 'You have not touched "{skillName}" in {daysIdle} days. Time to dust it off?',
      'pt-BR': 'Você não mexe em "{skillName}" há {daysIdle} dias. Hora de revisitar?',
    },
    params: ['skillName', 'daysIdle'],
  },
  APPLICATION_STALE: {
    title: {
      en: 'Your application at {companyName} is stale',
      'pt-BR': 'Sua candidatura em {companyName} está parada',
    },
    body: {
      en: 'No update from {companyName} for {daysSince} days on "{jobTitle}". Follow up?',
      'pt-BR': 'Sem retorno de {companyName} há {daysSince} dias em "{jobTitle}". Dar um toque?',
    },
    params: ['companyName', 'daysSince', 'jobTitle'],
  },
  CONNECTION_RECOMMENDATION: {
    title: {
      en: 'You might know {candidateName}',
      'pt-BR': 'Talvez você conheça {candidateName}',
    },
    body: {
      en: '{candidateName} shares {sharedSkillsCount} skills with you',
      'pt-BR': '{candidateName} compartilha {sharedSkillsCount} habilidades com você',
    },
    params: ['candidateName', 'sharedSkillsCount'],
  },
} as const satisfies NotificationDictionary;

export type NotificationCode = keyof typeof NOTIFICATION_DICTIONARY;

/** Render a notification template in a specific locale, interpolating params. */
export function renderNotification(
  code: NotificationCode,
  params: Readonly<Record<string, string | number>>,
  locale: Locale,
  part: 'title' | 'body',
): string {
  const template = NOTIFICATION_DICTIONARY[code][part][locale];
  return template.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (match, key: string) => {
    const v = params[key];
    return v === undefined ? match : String(v);
  });
}
