/**
 * Field-Level Translations
 *
 * Translations for field labels within section type definitions.
 * Structure: { [fieldKey]: { [locale]: { label, placeholder?, helpText? } } }
 *
 * These are merged into definition.fields[].meta.translations
 */

import { LOCALES } from '@packages/i18n';

export interface FieldTranslation {
  label?: string;
  placeholder?: string;
  helpText?: string;
}

export type FieldTranslationsMap = Record<string, Record<string, FieldTranslation>>;

function assertLocalesParity(name: string, map: FieldTranslationsMap): void {
  for (const [key, entry] of Object.entries(map)) {
    for (const locale of LOCALES) {
      if (!(locale in entry)) {
        console.error(`[field-translations] ${name}['${key}'] missing locale '${locale}'`);
        process.exit(1);
      }
    }
    for (const locale of Object.keys(entry)) {
      if (!(LOCALES as readonly string[]).includes(locale)) {
        console.error(`[field-translations] ${name}['${key}'] has rogue locale '${locale}'`);
        process.exit(1);
      }
    }
  }
}

// ============================================================================
// Work Experience Fields
// ============================================================================

export const workExperienceFieldTranslations: FieldTranslationsMap = {
  company: {
    en: { label: 'Company', placeholder: 'e.g., Google, Meta, Startup XYZ' },
    'pt-BR': { label: 'Empresa', placeholder: 'ex: Google, Meta, Startup XYZ' },
  },
  role: {
    en: { label: 'Role', placeholder: 'e.g., Software Engineer, Product Manager' },
    'pt-BR': { label: 'Cargo', placeholder: 'ex: Engenheiro de Software, Product Manager' },
  },
  employmentType: {
    en: { label: 'Employment Type' },
    'pt-BR': { label: 'Tipo de Emprego' },
  },
  startDate: {
    en: { label: 'Start Date' },
    'pt-BR': { label: 'Data de Início' },
  },
  endDate: {
    en: { label: 'End Date', helpText: 'Leave empty if currently working here' },
    'pt-BR': { label: 'Data de Término', helpText: 'Deixe vazio se ainda trabalha aqui' },
  },
  description: {
    en: { label: 'Description', placeholder: 'Describe your responsibilities and achievements...' },
    'pt-BR': {
      label: 'Descrição',
      placeholder: 'Descreva suas responsabilidades e conquistas...',
    },
  },
  achievements: {
    en: { label: 'Key Achievements', placeholder: 'Add an achievement...' },
    'pt-BR': { label: 'Principais Conquistas', placeholder: 'Adicione uma conquista...' },
  },
};

// ============================================================================
// Education Fields
// ============================================================================

export const educationFieldTranslations: FieldTranslationsMap = {
  institution: {
    en: { label: 'Institution', placeholder: 'e.g., MIT, Stanford University' },
    'pt-BR': { label: 'Instituição', placeholder: 'ex: USP, UNICAMP, PUC' },
  },
  degree: {
    en: { label: 'Degree', placeholder: "e.g., Bachelor's, Master's, PhD" },
    'pt-BR': { label: 'Grau', placeholder: 'ex: Bacharelado, Mestrado, Doutorado' },
  },
  field: {
    en: { label: 'Field of Study', placeholder: 'e.g., Computer Science, Engineering' },
    'pt-BR': { label: 'Área de Estudo', placeholder: 'ex: Ciência da Computação, Engenharia' },
  },
  startDate: {
    en: { label: 'Start Date' },
    'pt-BR': { label: 'Data de Início' },
  },
  endDate: {
    en: { label: 'End Date', helpText: 'Leave empty if still studying' },
    'pt-BR': { label: 'Data de Término', helpText: 'Deixe vazio se ainda está cursando' },
  },
  gpa: {
    en: { label: 'GPA', placeholder: 'e.g., 3.8/4.0' },
    'pt-BR': { label: 'Média/CR', placeholder: 'ex: 8.5/10' },
  },
  activities: {
    en: { label: 'Activities & Societies' },
    'pt-BR': { label: 'Atividades e Organizações' },
  },
};

// ============================================================================
// Skills Fields
// ============================================================================

export const skillsFieldTranslations: FieldTranslationsMap = {
  name: {
    en: { label: 'Skill Name', placeholder: 'e.g., TypeScript, React, AWS' },
    'pt-BR': { label: 'Nome da Habilidade', placeholder: 'ex: TypeScript, React, AWS' },
  },
  category: {
    en: { label: 'Category', placeholder: 'e.g., Frontend, Backend, DevOps' },
    'pt-BR': { label: 'Categoria', placeholder: 'ex: Frontend, Backend, DevOps' },
  },
  level: {
    en: { label: 'Proficiency Level' },
    'pt-BR': { label: 'Nível de Proficiência' },
  },
  yearsOfExperience: {
    en: { label: 'Years of Experience' },
    'pt-BR': { label: 'Anos de Experiência' },
  },
};

// ============================================================================
// Languages Fields
// ============================================================================

export const languageFieldTranslations: FieldTranslationsMap = {
  language: {
    en: { label: 'Language', placeholder: 'e.g., English, Spanish, Mandarin' },
    'pt-BR': { label: 'Idioma', placeholder: 'ex: Inglês, Espanhol, Mandarim' },
  },
  proficiency: {
    en: { label: 'Proficiency Level' },
    'pt-BR': { label: 'Nível de Proficiência' },
  },
  certification: {
    en: { label: 'Certification', placeholder: 'e.g., TOEFL, IELTS, DELE' },
    'pt-BR': { label: 'Certificação', placeholder: 'ex: TOEFL, IELTS, DELE' },
  },
};

// ============================================================================
// Certification Fields
// ============================================================================

export const certificationFieldTranslations: FieldTranslationsMap = {
  name: {
    en: { label: 'Certification Name', placeholder: 'e.g., AWS Solutions Architect' },
    'pt-BR': { label: 'Nome da Certificação', placeholder: 'ex: AWS Solutions Architect' },
  },
  issuer: {
    en: { label: 'Issuing Organization', placeholder: 'e.g., Amazon Web Services' },
    'pt-BR': { label: 'Organização Emissora', placeholder: 'ex: Amazon Web Services' },
  },
  issueDate: {
    en: { label: 'Issue Date' },
    'pt-BR': { label: 'Data de Emissão' },
  },
  expiryDate: {
    en: { label: 'Expiry Date', helpText: 'Leave empty if no expiration' },
    'pt-BR': { label: 'Data de Expiração', helpText: 'Deixe vazio se não expira' },
  },
  credentialId: {
    en: { label: 'Credential ID', placeholder: 'e.g., ABC123XYZ' },
    'pt-BR': { label: 'ID da Credencial', placeholder: 'ex: ABC123XYZ' },
  },
  credentialUrl: {
    en: { label: 'Credential URL', placeholder: 'https://...' },
    'pt-BR': { label: 'URL da Credencial', placeholder: 'https://...' },
  },
};

// ============================================================================
// Project Fields
// ============================================================================

export const projectFieldTranslations: FieldTranslationsMap = {
  name: {
    en: { label: 'Project Name', placeholder: 'e.g., E-commerce Platform' },
    'pt-BR': { label: 'Nome do Projeto', placeholder: 'ex: Plataforma de E-commerce' },
  },
  description: {
    en: { label: 'Description', placeholder: 'Describe your project...' },
    'pt-BR': { label: 'Descrição', placeholder: 'Descreva seu projeto...' },
  },
  url: {
    en: { label: 'Project URL', placeholder: 'https://...' },
    'pt-BR': { label: 'URL do Projeto', placeholder: 'https://...' },
  },
  repository: {
    en: { label: 'Repository URL', placeholder: 'https://github.com/...' },
    'pt-BR': { label: 'URL do Repositório', placeholder: 'https://github.com/...' },
  },
  startDate: {
    en: { label: 'Start Date' },
    'pt-BR': { label: 'Data de Início' },
  },
  endDate: {
    en: { label: 'End Date' },
    'pt-BR': { label: 'Data de Término' },
  },
  technologies: {
    en: { label: 'Technologies Used', placeholder: 'Add a technology...' },
    'pt-BR': { label: 'Tecnologias Utilizadas', placeholder: 'Adicione uma tecnologia...' },
  },
};

// ============================================================================
// Award Fields
// ============================================================================

export const awardFieldTranslations: FieldTranslationsMap = {
  title: {
    en: { label: 'Award Title', placeholder: 'e.g., Employee of the Year' },
    'pt-BR': { label: 'Título do Prêmio', placeholder: 'ex: Funcionário do Ano' },
  },
  issuer: {
    en: { label: 'Issuing Organization' },
    'pt-BR': { label: 'Organização Emissora' },
  },
  date: {
    en: { label: 'Date Received' },
    'pt-BR': { label: 'Data de Recebimento' },
  },
  description: {
    en: { label: 'Description' },
    'pt-BR': { label: 'Descrição' },
  },
};

// ============================================================================
// Volunteer Experience Fields
// ============================================================================

export const volunteerFieldTranslations: FieldTranslationsMap = {
  organization: {
    en: { label: 'Organization', placeholder: 'e.g., Red Cross, Local Food Bank' },
    'pt-BR': { label: 'Organização', placeholder: 'ex: Cruz Vermelha, Banco de Alimentos' },
  },
  role: {
    en: { label: 'Role', placeholder: 'e.g., Volunteer Coordinator' },
    'pt-BR': { label: 'Cargo', placeholder: 'ex: Coordenador Voluntário' },
  },
  startDate: {
    en: { label: 'Start Date' },
    'pt-BR': { label: 'Data de Início' },
  },
  endDate: {
    en: { label: 'End Date' },
    'pt-BR': { label: 'Data de Término' },
  },
  description: {
    en: { label: 'Description' },
    'pt-BR': { label: 'Descrição' },
  },
};

// ============================================================================
// Publication Fields
// ============================================================================

export const publicationFieldTranslations: FieldTranslationsMap = {
  title: {
    en: { label: 'Publication Title' },
    'pt-BR': { label: 'Título da Publicação' },
  },
  publisher: {
    en: { label: 'Publisher/Journal' },
    'pt-BR': { label: 'Editora/Revista' },
  },
  date: {
    en: { label: 'Publication Date' },
    'pt-BR': { label: 'Data de Publicação' },
  },
  url: {
    en: { label: 'URL' },
    'pt-BR': { label: 'URL' },
  },
  summary: {
    en: { label: 'Summary' },
    'pt-BR': { label: 'Resumo' },
  },
};

// ============================================================================
// Hackathon Fields
// ============================================================================

export const hackathonFieldTranslations: FieldTranslationsMap = {
  name: {
    en: { label: 'Hackathon Name', placeholder: 'e.g., ETHGlobal, Junction' },
    'pt-BR': { label: 'Nome do Hackathon', placeholder: 'ex: ETHGlobal, Junction' },
  },
  project: {
    en: { label: 'Project Name' },
    'pt-BR': { label: 'Nome do Projeto' },
  },
  date: {
    en: { label: 'Date' },
    'pt-BR': { label: 'Data' },
  },
  result: {
    en: { label: 'Result', placeholder: 'e.g., 1st Place, Finalist' },
    'pt-BR': { label: 'Resultado', placeholder: 'ex: 1º Lugar, Finalista' },
  },
  description: {
    en: { label: 'Description' },
    'pt-BR': { label: 'Descrição' },
  },
  url: {
    en: { label: 'Project URL' },
    'pt-BR': { label: 'URL do Projeto' },
  },
};

// ============================================================================
// Open Source Fields
// ============================================================================

export const openSourceFieldTranslations: FieldTranslationsMap = {
  project: {
    en: { label: 'Project Name', placeholder: 'e.g., React, Vue, Node.js' },
    'pt-BR': { label: 'Nome do Projeto', placeholder: 'ex: React, Vue, Node.js' },
  },
  role: {
    en: { label: 'Role', placeholder: 'e.g., Contributor, Maintainer' },
    'pt-BR': { label: 'Papel', placeholder: 'ex: Contribuidor, Mantenedor' },
  },
  description: {
    en: { label: 'Description' },
    'pt-BR': { label: 'Descrição' },
  },
  url: {
    en: { label: 'Repository URL' },
    'pt-BR': { label: 'URL do Repositório' },
  },
};

// ============================================================================
// Bug Bounty Fields
// ============================================================================

export const bugBountyFieldTranslations: FieldTranslationsMap = {
  program: {
    en: { label: 'Program Name', placeholder: 'e.g., Google VRP, HackerOne' },
    'pt-BR': { label: 'Nome do Programa', placeholder: 'ex: Google VRP, HackerOne' },
  },
  severity: {
    en: { label: 'Severity' },
    'pt-BR': { label: 'Severidade' },
  },
  date: {
    en: { label: 'Date Reported' },
    'pt-BR': { label: 'Data do Reporte' },
  },
  cve: {
    en: { label: 'CVE ID', placeholder: 'e.g., CVE-2023-XXXX' },
    'pt-BR': { label: 'ID CVE', placeholder: 'ex: CVE-2023-XXXX' },
  },
  description: {
    en: { label: 'Description' },
    'pt-BR': { label: 'Descrição' },
  },
};

// ============================================================================
// Talk Fields
// ============================================================================

export const talkFieldTranslations: FieldTranslationsMap = {
  title: {
    en: { label: 'Talk Title' },
    'pt-BR': { label: 'Título da Palestra' },
  },
  event: {
    en: { label: 'Event/Conference', placeholder: 'e.g., JSConf, ReactConf' },
    'pt-BR': { label: 'Evento/Conferência', placeholder: 'ex: JSConf, ReactConf' },
  },
  date: {
    en: { label: 'Date' },
    'pt-BR': { label: 'Data' },
  },
  description: {
    en: { label: 'Description' },
    'pt-BR': { label: 'Descrição' },
  },
  slidesUrl: {
    en: { label: 'Slides URL' },
    'pt-BR': { label: 'URL dos Slides' },
  },
  videoUrl: {
    en: { label: 'Video URL' },
    'pt-BR': { label: 'URL do Vídeo' },
  },
};

// ============================================================================
// Achievement Fields
// ============================================================================

export const achievementFieldTranslations: FieldTranslationsMap = {
  title: {
    en: { label: 'Achievement Title' },
    'pt-BR': { label: 'Título da Conquista' },
  },
  date: {
    en: { label: 'Date' },
    'pt-BR': { label: 'Data' },
  },
  description: {
    en: { label: 'Description' },
    'pt-BR': { label: 'Descrição' },
  },
};

// ============================================================================
// Master Map: Section Type Key → Field Translations
// ============================================================================

export const allFieldTranslations: Record<string, FieldTranslationsMap> = {
  work_experience_v1: workExperienceFieldTranslations,
  education_v1: educationFieldTranslations,
  skill_set_v1: skillsFieldTranslations,
  language_v1: languageFieldTranslations,
  certification_v1: certificationFieldTranslations,
  project_v1: projectFieldTranslations,
  award_v1: awardFieldTranslations,
  volunteer_v1: volunteerFieldTranslations,
  publication_v1: publicationFieldTranslations,
  hackathon_v1: hackathonFieldTranslations,
  open_source_v1: openSourceFieldTranslations,
  bug_bounty_v1: bugBountyFieldTranslations,
  talk_v1: talkFieldTranslations,
  achievement_v1: achievementFieldTranslations,
};

for (const [sectionKey, map] of Object.entries(allFieldTranslations)) {
  assertLocalesParity(sectionKey, map);
}

/**
 * Helper: Inject field translations into a definition
 * Used by seed scripts to enrich field meta with translations
 */
export function injectFieldTranslations(
  sectionTypeKey: string,
  definition: {
    fields?: Array<{
      key?: string;
      meta?: Record<string, unknown>;
      fields?: Array<unknown>;
      items?: unknown;
    }>;
    [key: string]: unknown;
  },
): typeof definition {
  const translations = allFieldTranslations[sectionTypeKey];
  if (!translations || !definition.fields) return definition;

  const enrichField = (field: {
    key?: string;
    meta?: Record<string, unknown>;
    fields?: unknown[];
    items?: unknown;
  }) => {
    if (!field.key) return field;

    const fieldTranslations = translations[field.key];
    if (!fieldTranslations) return field;

    return {
      ...field,
      meta: {
        ...field.meta,
        translations: fieldTranslations,
      },
    };
  };

  return {
    ...definition,
    fields: definition.fields.map(enrichField),
  };
}
