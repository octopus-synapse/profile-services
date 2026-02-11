import { getBaseTemplate } from './base.template';

export const getPasswordResetTemplate = (name: string, resetUrl: string): string => {
  const content = `
    <h2>Redefinir sua senha 🔐</h2>
    <p>Olá, ${name}!</p>
    <p>Recebemos uma solicitação para redefinir a senha da sua conta no ProFile.</p>
    <p>Clique no botão abaixo para criar uma nova senha:</p>
    <div style="text-align: center;">
      <a href="${resetUrl}" class="btn">
        Redefinir minha senha
      </a>
    </div>
    <div class="divider"></div>
    <p class="text-muted">
      Ou copie e cole este link no seu navegador:<br>
      <a href="${resetUrl}" style="color: #06b6d4; word-break: break-all; text-decoration: underline;">${resetUrl}</a>
    </p>
    <p class="text-muted" style="margin-top: 24px;">
      <strong style="color: #e4e4e7;">Este link expira em 1 hora.</strong>
    </p>
    <div class="warning-box">
      <p>
        ⚠️ <strong>Não solicitou esta alteração?</strong><br>
        Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanecerá inalterada e sua conta está segura.
      </p>
    </div>
  `;

  return getBaseTemplate(content, 'Redefinir senha - ProFile');
};
