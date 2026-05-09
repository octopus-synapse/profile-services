import type { FlagDefinition } from '../../domain/types';

export const RESUMES_FLAGS = [
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
] as const satisfies readonly FlagDefinition[];
