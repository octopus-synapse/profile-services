import type { Locale } from '@/shared-kernel/utils/locale-resolver.util';
import { getBaseTemplate } from './base.template';

export type ChangeCodeAction = 'change-email' | 'change-password' | 'delete-account';

const COPY = {
  'pt-BR': {
    title: 'Código de confirmação - Patch Careers',
    hello: (name: string) => `Olá, ${name}!`,
    intro: (action: string) =>
      `Recebemos um pedido para <strong>${action}</strong> na sua conta do <strong>Patch Careers</strong>. Use o código abaixo para confirmar:`,
    actions: {
      'change-email': 'alterar seu e-mail',
      'change-password': 'alterar sua senha',
      'delete-account': 'excluir sua conta',
    },
    expires: 'Este código expira em 15 minutos.',
    ignore: 'Se você não fez esse pedido, ignore este email — nada será alterado.',
  },
  en: {
    title: 'Confirmation code - Patch Careers',
    hello: (name: string) => `Hi ${name}!`,
    intro: (action: string) =>
      `We received a request to <strong>${action}</strong> on your <strong>Patch Careers</strong> account. Use the code below to confirm:`,
    actions: {
      'change-email': 'change your email',
      'change-password': 'change your password',
      'delete-account': 'delete your account',
    },
    expires: 'This code expires in 15 minutes.',
    ignore: 'If you did not make this request, ignore this email — nothing will change.',
  },
} as const;

/**
 * Code email for an authenticated change request (email change / password
 * change / account deletion). Unlike signup verification there is no deep
 * link — the user is already in the app's settings flow and types the code
 * there.
 */
export const getChangeCodeTemplate = (params: {
  name: string;
  code: string;
  action: ChangeCodeAction;
  locale?: Locale;
}): string => {
  const { name, code, action } = params;
  const locale = params.locale ?? 'pt-BR';
  const copy = COPY[locale];
  const content = `
    <h2>${copy.hello(name)}</h2>
    <p>${copy.intro(copy.actions[action])}</p>
    <div style="text-align: center; margin: 28px 0;">
      <div style="display: inline-block; padding: 16px 24px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
        <span style="font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 30px; letter-spacing: 8px; color: #111827; font-weight: 600;">
          ${code}
        </span>
      </div>
    </div>
    <p class="text-muted" style="margin-top: 20px;">
      <strong style="color: #111827;">${copy.expires}</strong><br>
      ${copy.ignore}
    </p>
  `;
  return getBaseTemplate(content, copy.title, undefined, locale);
};
