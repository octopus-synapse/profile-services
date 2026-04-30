import { getBaseTemplate } from './base.template';

export const getWelcomeEmailTemplate = (name: string, frontendUrl: string): string => {
  const content = `
    <h2>Bem-vindo ao Patch Careers!</h2>
    <p>Olá, ${name}!</p>
    <p>
      Seu email foi verificado com sucesso. Agora você tem acesso completo à
      plataforma Patch Careers.
    </p>
    <h3>O que você pode fazer agora:</h3>
    <ul style="font-size: 15px; line-height: 1.8; color: #374151; padding-left: 20px; margin: 0 0 16px;">
      <li>Criar seu primeiro currículo profissional</li>
      <li>Personalizar com templates modernos</li>
      <li>Adicionar suas experiências e projetos</li>
      <li>Integrar com seu GitHub</li>
      <li>Exportar em PDF ou DOCX</li>
      <li>Compartilhar seu portfólio online</li>
    </ul>
    <div style="text-align: center; margin-top: 28px;">
      <a href="${frontendUrl}/dashboard" class="btn">Começar agora</a>
    </div>
    <div class="divider"></div>
    <p class="text-muted" style="text-align: center;">
      Precisa de ajuda? Confira nosso <a href="${frontendUrl}/help">guia de início rápido</a>.
    </p>
  `;

  return getBaseTemplate(content, 'Bem-vindo ao Patch Careers!', frontendUrl);
};
