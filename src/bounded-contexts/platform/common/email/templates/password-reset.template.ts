import { getBaseTemplate } from './base.template';

export const getPasswordResetTemplate = (name: string, resetUrl: string): string => {
  const content = `
    <h2>Redefinir sua senha</h2>
    <p>Olá, ${name}!</p>
    <p>Recebemos uma solicitação para redefinir a senha da sua conta no Patch Careers.</p>
    <p>Clique no botão abaixo para criar uma nova senha:</p>
    <div style="text-align: center;">
      <a href="${resetUrl}" class="btn">Redefinir minha senha</a>
    </div>
    <div class="divider"></div>
    <p class="text-muted">
      Ou copie e cole este link no seu navegador:<br>
      <a href="${resetUrl}" style="word-break: break-all;">${resetUrl}</a>
    </p>
    <p class="text-muted" style="margin-top: 20px;">
      <strong style="color: #111827;">Este link expira em 1 hora.</strong>
    </p>
    <div class="warning-box">
      <p>
        <strong>Não solicitou esta alteração?</strong><br>
        Se você não solicitou a redefinição de senha, ignore este email. Sua senha
        permanecerá inalterada e sua conta está segura.
      </p>
    </div>
  `;

  return getBaseTemplate(content, 'Redefinir senha - Patch Careers');
};
