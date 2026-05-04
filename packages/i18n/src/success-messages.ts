/**
 * Success-message dictionary.
 *
 * Used by routes that return a localised user-facing confirmation
 * (DELETE/UPDATE/action endpoints — Q8 in the duplication audit).
 * Handlers return `{ code, params? }`; the response interceptor
 * translates via `renderSuccessMessage` using the request's
 * Accept-Language header.
 *
 * Add a new entry whenever a new success code is needed; the
 * `success-message-parity` arch test (TODO) keeps the dictionary
 * in sync with the in-app codes.
 */

import type { Locale, LocalizedMessages } from './types';

export interface SuccessMessageTemplate {
  readonly message: LocalizedMessages;
  /** Named placeholders the caller must supply. Consumed by tests + docs. */
  readonly params: readonly string[];
}

export type SuccessMessageDictionary = Readonly<Record<string, SuccessMessageTemplate>>;

export const SUCCESS_MESSAGE_DICTIONARY = {
  RESUME_DELETED: {
    message: {
      en: 'Resume deleted successfully.',
      'pt-BR': 'Currículo apagado com sucesso.',
    },
    params: [],
  },
  RESUME_UPDATED: {
    message: {
      en: 'Resume updated successfully.',
      'pt-BR': 'Currículo atualizado com sucesso.',
    },
    params: [],
  },
  USER_DELETED: {
    message: {
      en: 'Account deleted successfully.',
      'pt-BR': 'Conta apagada com sucesso.',
    },
    params: [],
  },
  LOGOUT_SUCCESS: {
    message: {
      en: 'Logged out successfully.',
      'pt-BR': 'Logout realizado com sucesso.',
    },
    params: [],
  },
  LOGOUT_ALL_SESSIONS: {
    message: {
      en: 'Logged out from all sessions.',
      'pt-BR': 'Logout realizado em todas as sessões.',
    },
    params: [],
  },
} as const satisfies SuccessMessageDictionary;

export type SuccessMessageCode = keyof typeof SUCCESS_MESSAGE_DICTIONARY;

/** Render a success message into a localised string. Mirrors `renderNotification`. */
export function renderSuccessMessage(
  code: SuccessMessageCode | string,
  params: Record<string, string | number | boolean> = {},
  locale: Locale = 'en',
): string {
  const entry = (SUCCESS_MESSAGE_DICTIONARY as SuccessMessageDictionary)[code];
  if (!entry) {
    return code; // Fallback to the raw code so failures are visible.
  }
  const template = entry.message[locale] ?? entry.message.en;
  return interpolate(template, params);
}

function interpolate(
  template: string,
  params: Record<string, string | number | boolean>,
): string {
  return template.replace(/\{\s*(\w+)\s*\}/g, (_, key) => {
    const value = params[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}
