import { getBaseTemplate } from './base.template';

export const getVerificationEmailTemplate = (
  name: string,
  verificationUrl: string,
): string => {
  const content = `
    <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">
      Olá, ${name}! 👋
    </h2>
    <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 24px;">
      Bem-vindo ao <strong>ProFile</strong>! Estamos muito felizes em tê-lo conosco.
    </p>
    <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 24px;">
      Para começar a usar sua conta e criar currículos incríveis, precisamos verificar seu endereço de email.
    </p>
    <div style="text-align: center;">
      <a href="${verificationUrl}" class="btn">
        Verificar meu email
      </a>
    </div>
    <div class="divider"></div>
    <p class="text-muted">
      Ou copie e cole este link no seu navegador:<br>
      <a href="${verificationUrl}" style="color: #3B82F6; word-break: break-all;">${verificationUrl}</a>
    </p>
    <p class="text-muted" style="margin-top: 24px;">
      <strong>Este link expira em 24 horas.</strong> Se você não criou uma conta no ProFile, ignore este email.
    </p>
  `;

  return getBaseTemplate(content, 'Verifique seu email - ProFile');
};
