import type { Locale } from '@/shared-kernel/utils/locale-resolver.util';
import { getBaseTemplate } from './base.template';

const COPY = {
  'pt-BR': {
    title: 'Senha alterada - Patch Careers',
    heading: 'Senha alterada com sucesso',
    hello: (name: string) => `Olá, ${name}!`,
    changedAt: (when: string) => `Sua senha foi alterada com sucesso em <strong>${when}</strong>.`,
    fine: 'Se você realizou esta alteração, não precisa fazer mais nada. Sua conta está segura.',
    warnTitle: 'Não reconhece esta alteração?',
    warn: 'Se você não alterou sua senha, sua conta pode estar comprometida. Entre em contato com nosso suporte imediatamente através de',
    button: 'Fazer login',
  },
  en: {
    title: 'Password changed - Patch Careers',
    heading: 'Your password was changed',
    hello: (name: string) => `Hi ${name}!`,
    changedAt: (when: string) => `Your password was changed on <strong>${when}</strong>.`,
    fine: 'If this was you, there is nothing else to do. Your account is safe.',
    warnTitle: "Don't recognise this change?",
    warn: 'If you did not change your password, your account may be compromised. Contact our support right away at',
    button: 'Sign in',
  },
} as const;

// The timestamp is formatted in the same locale as the copy — the two must
// never drift apart (P2-112).
export const getPasswordChangedTemplate = (
  name: string,
  frontendUrl: string,
  locale: Locale = 'pt-BR',
  now: Date = new Date(),
): string => {
  const copy = COPY[locale];
  const content = `
    <h2>${copy.heading}</h2>
    <p>${copy.hello(name)}</p>
    <p>${copy.changedAt(now.toLocaleString(locale))}</p>
    <p>${copy.fine}</p>
    <div class="warning-box">
      <p>
        <strong>${copy.warnTitle}</strong><br>
        ${copy.warn}
        <a href="mailto:support@patchcareers.org">support@patchcareers.org</a>.
      </p>
    </div>
    <div style="text-align: center; margin-top: 28px;">
      <a href="${frontendUrl}/login" class="btn">${copy.button}</a>
    </div>
  `;
  return getBaseTemplate(content, copy.title, frontendUrl, locale);
};
