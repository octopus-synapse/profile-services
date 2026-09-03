import type { Locale } from '@/shared-kernel/utils/locale-resolver.util';
import { getBaseTemplate } from './base.template';

const COPY = {
  'pt-BR': {
    title: 'Bem-vindo ao Patch Careers!',
    hello: (name: string) => `Olá, ${name}!`,
    verified:
      'Seu email foi verificado com sucesso. Agora você tem acesso completo à plataforma Patch Careers.',
    now: 'O que você pode fazer agora:',
    items: [
      'Criar seu primeiro currículo profissional',
      'Personalizar com templates modernos',
      'Adicionar suas experiências e projetos',
      'Exportar em PDF ou DOCX',
      'Compartilhar seu portfólio online',
    ],
    cta: 'Começar agora',
    help: (url: string) =>
      `Precisa de ajuda? Confira nosso <a href="${url}/help">guia de início rápido</a>.`,
  },
  en: {
    title: 'Welcome to Patch Careers!',
    hello: (name: string) => `Hi ${name}!`,
    verified: 'Your email is verified. You now have full access to Patch Careers.',
    now: 'What you can do now:',
    items: [
      'Create your first professional résumé',
      'Style it with modern templates',
      'Add your experience and projects',
      'Export to PDF or DOCX',
      'Share your portfolio online',
    ],
    cta: 'Get started',
    help: (url: string) => `Need a hand? See our <a href="${url}/help">quick-start guide</a>.`,
  },
} as const;

export const getWelcomeEmailTemplate = (
  name: string,
  frontendUrl: string,
  locale: Locale = 'pt-BR',
): string => {
  const copy = COPY[locale];
  const content = `
    <h2>${copy.title}</h2>
    <p>${copy.hello(name)}</p>
    <p>${copy.verified}</p>
    <h3>${copy.now}</h3>
    <ul style="font-size: 15px; line-height: 1.8; color: #374151; padding-left: 20px; margin: 0 0 16px;">
      ${copy.items.map((item) => `<li>${item}</li>`).join('\n      ')}
    </ul>
    <div style="text-align: center; margin-top: 28px;">
      <a href="${frontendUrl}/dashboard" class="btn">${copy.cta}</a>
    </div>
    <div class="divider"></div>
    <p class="text-muted" style="text-align: center;">
      ${copy.help(frontendUrl)}
    </p>
  `;
  return getBaseTemplate(content, copy.title, frontendUrl, locale);
};
