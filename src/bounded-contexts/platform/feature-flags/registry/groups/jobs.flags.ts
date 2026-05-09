import type { FlagDefinition } from '../../domain/types';

export const JOBS_FLAGS = [
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
] as const satisfies readonly FlagDefinition[];
