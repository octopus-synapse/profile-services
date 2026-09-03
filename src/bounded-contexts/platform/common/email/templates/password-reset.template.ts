import type { Locale } from '@/shared-kernel/utils/locale-resolver.util';
import { getBaseTemplate } from './base.template';

const COPY = {
  'pt-BR': {
    title: 'Redefinir senha - Patch Careers',
    heading: 'Redefinir sua senha',
    hello: (name: string) => `Olá, ${name}!`,
    intro: 'Recebemos uma solicitação para redefinir a senha da sua conta no Patch Careers.',
    click: 'Clique no botão abaixo para criar uma nova senha:',
    button: 'Redefinir minha senha',
    fallback: 'Ou copie e cole este link no seu navegador:',
    warnTitle: 'Não solicitou esta alteração?',
    warn: 'Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanecerá inalterada e sua conta está segura.',
  },
  en: {
    title: 'Reset your password - Patch Careers',
    heading: 'Reset your password',
    hello: (name: string) => `Hi ${name}!`,
    intro: 'We received a request to reset the password of your Patch Careers account.',
    click: 'Click the button below to choose a new password:',
    button: 'Reset my password',
    fallback: 'Or copy and paste this link into your browser:',
    warnTitle: "Didn't request this?",
    warn: 'If you did not ask for a password reset, ignore this email. Your password stays the same and your account is safe.',
  },
} as const;

export const getPasswordResetTemplate = (
  name: string,
  resetUrl: string,
  locale: Locale = 'pt-BR',
): string => {
  const copy = COPY[locale];
  const content = `
    <h2>${copy.heading}</h2>
    <p>${copy.hello(name)}</p>
    <p>${copy.intro}</p>
    <p>${copy.click}</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${resetUrl}" class="btn">${copy.button}</a>
    </div>
    <div class="divider"></div>
    <p class="text-muted">
      ${copy.fallback}<br>
      <a href="${resetUrl}" style="word-break: break-all;">${resetUrl}</a>
    </p>
    <div class="warning-box">
      <p>
        <strong>${copy.warnTitle}</strong><br>
        ${copy.warn}
      </p>
    </div>
  `;
  return getBaseTemplate(content, copy.title, undefined, locale);
};
