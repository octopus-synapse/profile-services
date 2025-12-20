import { getBaseTemplate } from './base.template';

export const getWelcomeEmailTemplate = (name: string): string => {
  const content = `
    <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">
      Bem-vindo ao ProFile! 🎉
    </h2>
    <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 24px;">
      Olá, ${name}!
    </p>
    <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 24px;">
      Seu email foi verificado com sucesso! Agora você tem acesso completo à plataforma ProFile.
    </p>
    <h3 style="color: #1f2937; font-size: 18px; margin-top: 32px; margin-bottom: 16px;">
      O que você pode fazer agora:
    </h3>
    <ul style="font-size: 15px; line-height: 1.8; color: #4b5563; padding-left: 20px;">
      <li>✨ Criar seu primeiro currículo profissional</li>
      <li>🎨 Personalizar com templates modernos</li>
      <li>📊 Adicionar suas experiências e projetos</li>
      <li>🔗 Integrar com seu GitHub</li>
      <li>📄 Exportar em PDF ou DOCX</li>
      <li>🌐 Compartilhar seu portfólio online</li>
    </ul>
    <div style="text-align: center; margin-top: 32px;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="btn">
        Começar agora
      </a>
    </div>
    <div class="divider"></div>
    <p class="text-muted" style="text-align: center;">
      Precisa de ajuda? Confira nosso <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/help" style="color: #3B82F6;">guia de início rápido</a>
    </p>
  `;

  return getBaseTemplate(content, 'Bem-vindo ao ProFile!');
};
