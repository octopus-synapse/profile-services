import { getBaseTemplate } from './base.template';

export const getPasswordChangedTemplate = (name: string): string => {
  const content = `
    <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">
      Senha alterada com sucesso ✅
    </h2>
    <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 24px;">
      Olá, ${name}!
    </p>
    <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 24px;">
      Sua senha foi alterada com sucesso em <strong>${new Date().toLocaleString('pt-BR')}</strong>.
    </p>
    <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 24px;">
      Se você realizou esta alteração, não precisa fazer mais nada. Sua conta está segura!
    </p>
    <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin-top: 24px; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #7f1d1d;">
        🚨 <strong>Não reconhece esta alteração?</strong><br>
        Se você não alterou sua senha, sua conta pode estar comprometida. Entre em contato com nosso suporte imediatamente através de <a href="mailto:support@profile.com" style="color: #dc2626;">support@profile.com</a>
      </p>
    </div>
    <div style="text-align: center; margin-top: 32px;">
      <a href="${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/login" class="btn">
        Fazer login
      </a>
    </div>
  `;

  return getBaseTemplate(content, 'Senha alterada - ProFile');
};
