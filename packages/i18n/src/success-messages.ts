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

  // P1-045 — entries replacing the 16 hardcoded EN strings the
  // audit flagged in users / email-verification / account-lifecycle /
  // password-management / resume-analytics / resumes routes.
  PREFERENCES_UPDATED: {
    message: {
      en: 'Preferences updated successfully.',
      'pt-BR': 'Preferências atualizadas com sucesso.',
    },
    params: [],
  },
  PASSWORD_RESET: {
    message: {
      en: 'Password reset successfully.',
      'pt-BR': 'Senha redefinida com sucesso.',
    },
    params: [],
  },
  PASSWORD_CHANGED: {
    message: {
      en: 'Password has been changed successfully.',
      'pt-BR': 'Senha alterada com sucesso.',
    },
    params: [],
  },
  PASSWORD_CHANGE_CODE_SENT: {
    message: {
      en: 'We sent a confirmation code to your email.',
      'pt-BR': 'Enviamos um código de confirmação para o seu e-mail.',
    },
    params: [],
  },
  EMAIL_CHANGE_CODE_SENT: {
    message: {
      en: 'We sent a confirmation code to your new email.',
      'pt-BR': 'Enviamos um código de confirmação para o seu novo e-mail.',
    },
    params: [],
  },
  ACCOUNT_DELETION_CODE_SENT: {
    message: {
      en: 'We sent a confirmation code to your email.',
      'pt-BR': 'Enviamos um código de confirmação para o seu e-mail.',
    },
    params: [],
  },
  EMAIL_CHANGED: {
    message: {
      en: 'Your email has been changed successfully.',
      'pt-BR': 'Seu e-mail foi alterado com sucesso.',
    },
    params: [],
  },
  CONNECTED_ACCOUNT_DISCONNECTED: {
    message: {
      en: 'Account disconnected.',
      'pt-BR': 'Conta desconectada.',
    },
    params: [],
  },
  PUSH_DEVICE_REGISTERED: {
    message: {
      en: 'Push notifications enabled on this device.',
      'pt-BR': 'Notificações push ativadas neste dispositivo.',
    },
    params: [],
  },
  PUSH_DEVICE_UNREGISTERED: {
    message: {
      en: 'Push notifications disabled on this device.',
      'pt-BR': 'Notificações push desativadas neste dispositivo.',
    },
    params: [],
  },
  PASSWORD_RESET_LINK_SENT: {
    message: {
      en: 'If this email exists, a reset link has been sent.',
      'pt-BR': 'Se este e-mail existir, um link de redefinição foi enviado.',
    },
    params: [],
  },
  ROLES_UPDATED: {
    message: {
      en: 'Roles updated successfully.',
      'pt-BR': 'Permissões atualizadas com sucesso.',
    },
    params: [],
  },
  ACCOUNT_DEACTIVATED: {
    message: {
      en: 'Account has been deactivated.',
      'pt-BR': 'Conta desativada.',
    },
    params: [],
  },
  ACCOUNT_DELETED: {
    message: {
      en: 'Account has been permanently deleted.',
      'pt-BR': 'Conta excluída permanentemente.',
    },
    params: [],
  },
  EMAIL_VERIFICATION_SENT: {
    message: {
      en: 'Verification email has been sent.',
      'pt-BR': 'E-mail de verificação enviado.',
    },
    params: [],
  },
  RESUME_VIEW_TRACKED: {
    message: {
      en: 'View tracked successfully.',
      'pt-BR': 'Visualização registrada com sucesso.',
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

function interpolate(template: string, params: Record<string, string | number | boolean>): string {
  return template.replace(/\{\s*(\w+)\s*\}/g, (_, key) => {
    const value = params[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}
