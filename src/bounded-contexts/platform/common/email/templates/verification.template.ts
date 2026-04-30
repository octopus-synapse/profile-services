import { getBaseTemplate } from './base.template';

export const getVerificationEmailTemplate = (
  name: string,
  code: string,
  verificationUrl: string,
): string => {
  const content = `
    <h2>Olá, ${name}!</h2>
    <p>
      Bem-vindo ao <strong>Patch Careers</strong>. Para confirmar seu email,
      use o código abaixo na tela de verificação:
    </p>
    <div style="text-align: center; margin: 28px 0;">
      <div style="display: inline-block; padding: 16px 24px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
        <span style="font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 30px; letter-spacing: 8px; color: #111827; font-weight: 600;">
          ${code}
        </span>
      </div>
    </div>
    <div style="text-align: center; margin: 8px 0 24px;">
      <a href="${verificationUrl}" class="btn">Verificar email</a>
    </div>
    <div class="divider"></div>
    <p class="text-muted">
      Se o botão não funcionar, copie e cole este link no navegador:<br>
      <a href="${verificationUrl}" style="word-break: break-all;">${verificationUrl}</a>
    </p>
    <p class="text-muted" style="margin-top: 20px;">
      <strong style="color: #111827;">Este código expira em 15 minutos.</strong>
      Se você não criou uma conta no Patch Careers, ignore este email.
    </p>
  `;

  return getBaseTemplate(content, 'Verifique seu email - Patch Careers');
};
