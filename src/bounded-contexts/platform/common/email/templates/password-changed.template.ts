import { getBaseTemplate } from './base.template';

export const getPasswordChangedTemplate = (name: string, frontendUrl: string): string => {
  const content = `
    <h2>Senha alterada com sucesso</h2>
    <p>Olá, ${name}!</p>
    <p>
      Sua senha foi alterada com sucesso em
      <strong>${new Date().toLocaleString('pt-BR')}</strong>.
    </p>
    <p>Se você realizou esta alteração, não precisa fazer mais nada. Sua conta está segura.</p>
    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 14px 16px; margin-top: 24px; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #991b1b;">
        <strong>Não reconhece esta alteração?</strong><br>
        Se você não alterou sua senha, sua conta pode estar comprometida. Entre
        em contato com nosso suporte imediatamente através de
        <a href="mailto:support@patchcareers.com" style="color: #dc2626;">support@patchcareers.com</a>.
      </p>
    </div>
    <div style="text-align: center; margin-top: 28px;">
      <a href="${frontendUrl}/login" class="btn">Fazer login</a>
    </div>
  `;

  return getBaseTemplate(content, 'Senha alterada - Patch Careers', frontendUrl);
};
