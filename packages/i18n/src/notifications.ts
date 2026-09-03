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
  FIT_PROFILE_EXPIRED: {
    title: {
      en: 'Your fit profile expired',
      'pt-BR': 'Seu perfil de fit expirou',
    },
    body: {
      en: 'Retake the {questionCount}-question quiz to unlock match scoring again.',
      'pt-BR': 'Refaça o questionário de {questionCount} perguntas para liberar o match novamente.',
    },
    params: ['questionCount'],
  },
  FIT_PROFILE_EXPIRY_REMINDER: {
    title: {
      en: 'Your fit profile expires in {daysLeft} days',
      'pt-BR': 'Seu perfil de fit expira em {daysLeft} dias',
    },
    body: {
      en: 'Retake the quiz before {expiresAt} to keep using match scoring without interruption.',
      'pt-BR':
        'Refaça o questionário antes de {expiresAt} para continuar usando o match sem interrupção.',
    },
    params: ['daysLeft', 'expiresAt'],
  },
  MATCH_RECOMMENDATIONS_READY: {
    title: {
      en: '{matchCount} new job matches are ready',
      'pt-BR': '{matchCount} novas vagas combinam com você',
    },
    body: {
      en: 'We ranked the latest jobs in your areas of interest. Top match: {topMatchTitle}.',
      'pt-BR':
        'Rankeamos as vagas mais recentes nas suas áreas de interesse. Top match: {topMatchTitle}.',
    },
    params: ['matchCount', 'topMatchTitle'],
  },
  MESSAGE_RECEIVED: {
    title: {
      en: 'New message from {actorName}',
      'pt-BR': 'Nova mensagem de {actorName}',
    },
    body: {
      en: '{actorName} sent you a message: "{messageExcerpt}"',
      'pt-BR': '{actorName} te enviou uma mensagem: "{messageExcerpt}"',
    },
    params: ['actorName', 'messageExcerpt'],
  },
  RESUME_QUALITY_IMPROVED: {
    title: {
      en: 'Your resume score moved up to {newRank}',
      'pt-BR': 'Seu currículo subiu para a faixa {newRank}',
    },
    body: {
      en: 'Your latest snapshot ({newScore}/100) crossed the {previousRank} → {newRank} boundary. Keep going.',
      'pt-BR':
        'Seu novo snapshot ({newScore}/100) cruzou a faixa {previousRank} → {newRank}. Continua assim.',
    },
    params: ['newScore', 'previousRank', 'newRank'],
  },
  RESUME_QUALITY_REGRESSED: {
    title: {
      en: 'Your resume score dropped to {newRank}',
      'pt-BR': 'Seu currículo caiu para a faixa {newRank}',
    },
    body: {
      en: 'Your latest snapshot ({newScore}/100) crossed the {previousRank} → {newRank} boundary. Open the resume to see what changed.',
      'pt-BR':
        'Seu novo snapshot ({newScore}/100) cruzou a faixa {previousRank} → {newRank}. Abra o currículo pra ver o que mudou.',
    },
    params: ['newScore', 'previousRank', 'newRank'],
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
