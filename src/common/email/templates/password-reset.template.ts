import { getBaseTemplate } from './base.template';

export const getPasswordResetTemplate = (
  name: string,
  resetUrl: string,
): string => {
  const content = `
    <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">
      Redefinir sua senha 🔐
    </h2>
    <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 24px;">
      Olá, ${name}!
    </p>
    <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 24px;">
      Recebemos uma solicitação para redefinir a senha da sua conta no ProFile.
    </p>
    <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 24px;">
      Clique no botão abaixo para criar uma nova senha:
    </p>
    <div style="text-align: center;">
      <a href="${resetUrl}" class="btn">
        Redefinir minha senha
      </a>
    </div>
    <div class="divider"></div>
    <p class="text-muted">
      Ou copie e cole este link no seu navegador:<br>
      <a href="${resetUrl}" style="color: #3B82F6; word-break: break-all;">${resetUrl}</a>
    </p>
    <p class="text-muted" style="margin-top: 24px;">
      <strong>Este link expira em 1 hora.</strong>
    </p>
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-top: 24px; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        ⚠️ <strong>Não solicitou esta alteração?</strong><br>
        Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanecerá inalterada e sua conta está segura.
      </p>
    </div>
  `;

  return getBaseTemplate(content, 'Redefinir senha - ProFile');
};
