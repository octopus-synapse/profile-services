import type { Locale } from '@/shared-kernel/utils/locale-resolver.util';
import { getBaseTemplate } from './base.template';

const COPY = {
  'pt-BR': {
    title: 'Verifique seu email - Patch Careers',
    hello: (name: string) => `Olá, ${name}!`,
    intro:
      'Bem-vindo ao <strong>Patch Careers</strong>. Para confirmar seu email, use o código abaixo na tela de verificação:',
    button: 'Verificar email',
    fallback: 'Se o botão não funcionar, copie e cole este link no navegador:',
    expires: 'Este código expira em 15 minutos.',
    ignore: 'Se você não criou uma conta no Patch Careers, ignore este email.',
  },
  en: {
    title: 'Verify your email - Patch Careers',
    hello: (name: string) => `Hi ${name}!`,
    intro:
      'Welcome to <strong>Patch Careers</strong>. To confirm your email, enter the code below on the verification screen:',
    button: 'Verify email',
    fallback: 'If the button does not work, copy and paste this link into your browser:',
    expires: 'This code expires in 15 minutes.',
    ignore: 'If you did not create a Patch Careers account, ignore this email.',
  },
} as const;

export const getVerificationEmailTemplate = (
  name: string,
  code: string,
  verificationUrl: string,
  locale: Locale = 'pt-BR',
): string => {
  const copy = COPY[locale];
  const content = `
    <h2>${copy.hello(name)}</h2>
    <p>${copy.intro}</p>
    <div style="text-align: center; margin: 28px 0;">
      <div style="display: inline-block; padding: 16px 24px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
        <span style="font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 30px; letter-spacing: 8px; color: #111827; font-weight: 600;">
          ${code}
        </span>
      </div>
    </div>
    <div style="text-align: center; margin: 8px 0 24px;">
      <a href="${verificationUrl}" class="btn">${copy.button}</a>
    </div>
    <div class="divider"></div>
    <p class="text-muted">
      ${copy.fallback}<br>
      <a href="${verificationUrl}" style="word-break: break-all;">${verificationUrl}</a>
    </p>
    <p class="text-muted" style="margin-top: 20px;">
      <strong style="color: #111827;">${copy.expires}</strong><br>
      ${copy.ignore}
    </p>
  `;
  return getBaseTemplate(content, copy.title, undefined, locale);
};
