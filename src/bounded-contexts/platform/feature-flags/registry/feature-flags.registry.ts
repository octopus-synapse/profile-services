import type { FlagDefinition } from '../domain/types';

/**
 * Source of truth for flags that the application code checks.
 *
 * Rules:
 * - Add a flag here BEFORE referencing it in code — boot validates the DAG.
 * - Declare parents in `dependsOn` so cascading OFF works automatically.
 * - Removing a flag marks existing DB row as `deprecated` (not deleted) so
 *   audit history survives. If you later re-add the key, it re-activates.
 * - `defaultEnabled` only applies on first insert. After that, admin state wins.
 */
export const FEATURE_FLAGS_REGISTRY = [
  // ─── Resumes ──────────────────────────────────────────────────────────
  {
    key: 'resumes',
    name: 'Currículos',
    description: 'Módulo principal de currículos',
    defaultEnabled: true,
    dependsOn: [],
  },
  {
    key: 'resumes.ai-rewrite',
    name: 'Reescrita por IA',
    description: 'IA reescreve o currículo para cada vaga',
    defaultEnabled: true,
    dependsOn: ['resumes'],
  },
  {
    key: 'resumes.ats-score',
    name: 'ATS Score',
    description: 'Cálculo do score de compatibilidade com ATS',
    defaultEnabled: true,
    dependsOn: ['resumes'],
  },
  {
    key: 'resumes.auto-apply',
    name: 'Auto-Apply',
    description: 'Aplica automaticamente em vagas com match real',
    defaultEnabled: false,
    dependsOn: ['resumes', 'resumes.ats-score'],
  },
  {
    key: 'resumes.import',
    name: 'Importação de currículo',
    description: 'Importa um currículo existente do usuário',
    defaultEnabled: true,
    dependsOn: ['resumes'],
  },
  {
    key: 'resumes.import.linkedin',
    name: 'Importar do LinkedIn',
    description: 'Puxa dados do perfil do LinkedIn',
    defaultEnabled: true,
    dependsOn: ['resumes.import'],
  },
  {
    key: 'resumes.import.pdf',
    name: 'Importar PDF',
    description: 'Parse de currículo em PDF',
    defaultEnabled: true,
    dependsOn: ['resumes.import'],
  },
  {
    key: 'resumes.export',
    name: 'Exportação de currículos',
    description: 'Exporta o currículo para formatos externos',
    defaultEnabled: true,
    dependsOn: ['resumes'],
  },
  {
    key: 'resumes.export.pdf',
    name: 'Exportar PDF',
    description: 'Gera um PDF do currículo',
    defaultEnabled: true,
    dependsOn: ['resumes.export'],
  },
  {
    key: 'resumes.export.docx',
    name: 'Exportar DOCX',
    description: 'Gera um DOCX do currículo',
    defaultEnabled: true,
    dependsOn: ['resumes.export'],
  },

  // ─── Jobs ─────────────────────────────────────────────────────────────
  {
    key: 'jobs',
    name: 'Vagas',
    description: 'Módulo de listagem e busca de vagas',
    defaultEnabled: true,
    dependsOn: [],
  },
  {
    key: 'jobs.search',
    name: 'Busca de vagas',
    description: 'Busca full-text com filtros de stack e senioridade',
    defaultEnabled: true,
    dependsOn: ['jobs'],
  },
  {
    key: 'jobs.alerts',
    name: 'Alertas de vagas',
    description: 'Notificações quando surge uma vaga com match',
    defaultEnabled: true,
    dependsOn: ['jobs'],
  },
  {
    key: 'jobs.remote-usd',
    name: 'Filtro remoto USD',
    description: 'Destaca vagas remotas pagas em dólar',
    defaultEnabled: true,
    dependsOn: ['jobs.search'],
  },
  {
    key: 'jobs.salary-insights',
    name: 'Insights salariais',
    description: 'Mostra faixa salarial estimada por vaga (beta)',
    defaultEnabled: false,
    dependsOn: ['jobs'],
  },

  // ─── Social ───────────────────────────────────────────────────────────
  {
    key: 'social',
    name: 'Social',
    description: 'Rede social interna: feed, conexões, interações',
    defaultEnabled: true,
    dependsOn: [],
  },
  {
    key: 'social.feed',
    name: 'Feed',
    description: 'Feed de publicações da rede',
    defaultEnabled: true,
    dependsOn: ['social'],
  },
  {
    key: 'social.network',
    name: 'Minha Rede',
    description: 'Gestão de conexões e convites',
    defaultEnabled: true,
    dependsOn: ['social'],
  },
  {
    key: 'social.polls',
    name: 'Enquetes',
    description: 'Publicações com enquete',
    defaultEnabled: true,
    dependsOn: ['social.feed'],
  },
  {
    key: 'social.reactions',
    name: 'Reações',
    description: 'Reações em publicações do feed',
    defaultEnabled: true,
    dependsOn: ['social.feed'],
  },

  // ─── Chat ─────────────────────────────────────────────────────────────
  {
    key: 'chat',
    name: 'Chat',
    description: 'Widget de chat e mensagens',
    defaultEnabled: true,
    dependsOn: [],
  },
  {
    key: 'chat.ai-assistant',
    name: 'Assistente IA',
    description: 'Assistente de carreira em linguagem natural',
    defaultEnabled: true,
    dependsOn: ['chat'],
  },
  {
    key: 'chat.realtime',
    name: 'Chat realtime',
    description: 'Mensagens em tempo real via WebSocket (beta)',
    defaultEnabled: false,
    dependsOn: ['chat'],
  },

  // ─── Notifications ────────────────────────────────────────────────────
  {
    key: 'notifications',
    name: 'Notificações',
    description: 'Central de notificações do usuário',
    defaultEnabled: true,
    dependsOn: [],
  },
  {
    key: 'notifications.email',
    name: 'Email',
    description: 'Notificações transacionais por email',
    defaultEnabled: true,
    dependsOn: ['notifications'],
  },
  {
    key: 'notifications.push',
    name: 'Web Push',
    description: 'Push notifications no navegador (beta)',
    defaultEnabled: false,
    dependsOn: ['notifications'],
  },
  {
    key: 'notifications.digest',
    name: 'Resumo semanal',
    description: 'Digest semanal de vagas e atividade',
    defaultEnabled: true,
    dependsOn: ['notifications.email'],
  },

  // ─── Billing ──────────────────────────────────────────────────────────
  {
    key: 'billing',
    name: 'Cobrança',
    description: 'Módulo de cobrança e assinatura',
    defaultEnabled: true,
    dependsOn: [],
  },
  {
    key: 'billing.early-access-pool',
    name: 'Pool de early access',
    description: 'Cap de 200 usuários com preço travado',
    defaultEnabled: true,
    dependsOn: ['billing'],
  },
  {
    key: 'billing.stripe',
    name: 'Stripe',
    description: 'Integração com Stripe para pagamentos',
    defaultEnabled: true,
    dependsOn: ['billing'],
  },

  // ─── Integrations ─────────────────────────────────────────────────────
  {
    key: 'integrations',
    name: 'Integrações',
    description: 'Integrações com serviços externos',
    defaultEnabled: true,
    dependsOn: [],
  },
  {
    key: 'integrations.linkedin',
    name: 'LinkedIn',
    description: 'OAuth LinkedIn para importação de perfil',
    defaultEnabled: true,
    dependsOn: ['integrations'],
  },
  {
    key: 'integrations.gmail',
    name: 'Gmail',
    description: 'Leitura de emails de recrutadores (opt-in)',
    defaultEnabled: false,
    dependsOn: ['integrations'],
  },
  {
    key: 'integrations.calendar',
    name: 'Google Calendar',
    description: 'Sincroniza entrevistas com o calendário',
    defaultEnabled: false,
    dependsOn: ['integrations'],
  },

  // ─── Experiments ──────────────────────────────────────────────────────
  {
    key: 'experiments',
    name: 'Experimentos',
    description: 'Flag raiz para testes A/B e features beta',
    defaultEnabled: false,
    dependsOn: [],
  },
  {
    key: 'experiments.onboarding-v2',
    name: 'Onboarding v2',
    description: 'Novo fluxo de onboarding em 3 passos',
    defaultEnabled: false,
    dependsOn: ['experiments'],
  },
  {
    key: 'experiments.pricing-ab',
    name: 'Pricing A/B',
    description: 'Teste de copy na página de pricing',
    defaultEnabled: false,
    dependsOn: ['experiments'],
  },

  // ─── Scoring ──────────────────────────────────────────────────────────
  // Root for the scoring subsystem. Individual kill-switches below.
  {
    key: 'scoring',
    name: 'Scoring',
    description: 'Subsistema de scores (Style, Resume Quality, Match, Fit)',
    defaultEnabled: true,
    dependsOn: [],
  },
  {
    key: 'scoring.content-quality.enabled',
    name: 'Content Quality (IA)',
    description: 'Habilita avaliação de qualidade de redação via LLM. Kill-switch global.',
    defaultEnabled: true,
    dependsOn: ['scoring'],
  },
  {
    key: 'scoring.match.semantic.enabled',
    name: 'Match semântico (embeddings)',
    description:
      'Habilita sub-score de similaridade semântica CV↔vaga via embeddings. Kill-switch global.',
    defaultEnabled: true,
    dependsOn: ['scoring'],
  },
  {
    key: 'scoring.match.daily-recommendations',
    name: 'Recomendações a cada 3 dias',
    description: 'Cron que computa top-N matches por user nas áreas de interesse',
    defaultEnabled: false,
    dependsOn: ['scoring'],
  },
  {
    key: 'fit-profile.required-for-standard-user',
    name: 'Fit profile obrigatório (standard user)',
    description:
      'Gate que exige questionário de fit respondido (e válido por 90d) pra ver Match, aplicar em vagas internas, usar AI tailor e auto-apply',
    defaultEnabled: true,
    dependsOn: [],
  },
] satisfies readonly FlagDefinition[];

export type RegisteredFlagKey = (typeof FEATURE_FLAGS_REGISTRY)[number]['key'];
