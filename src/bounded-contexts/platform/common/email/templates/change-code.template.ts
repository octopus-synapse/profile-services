import { getBaseTemplate } from './base.template';

/**
 * Code email for an authenticated change request (email change / password
 * change). Unlike signup verification there is no deep link — the user is
 * already in the app's settings flow and types the code there.
 */
export const getChangeCodeTemplate = (params: {
  name: string;
  code: string;
  /** e.g. "alterar seu e-mail" / "alterar sua senha". */
  actionLabel: string;
}): string => {
  const { name, code, actionLabel } = params;
  const content = `
    <h2>Olá, ${name}!</h2>
    <p>
      Recebemos um pedido para <strong>${actionLabel}</strong> na sua conta do
      <strong>Patch Careers</strong>. Use o código abaixo para confirmar:
    </p>
    <div style="text-align: center; margin: 28px 0;">
      <div style="display: inline-block; padding: 16px 24px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
        <span style="font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 30px; letter-spacing: 8px; color: #111827; font-weight: 600;">
          ${code}
        </span>
      </div>
    </div>
    <p class="text-muted" style="margin-top: 20px;">
      <strong style="color: #111827;">Este código expira em 15 minutos.</strong>
      Se você não fez esse pedido, ignore este email — nada será alterado.
    </p>
  `;

  return getBaseTemplate(content, 'Código de confirmação - Patch Careers');
};
