/**
 * Field-Level Translations
 *
 * Translations for field labels within section type definitions.
 * Structure: { [fieldKey]: { [locale]: { label, placeholder?, helpText? } } }
 *
 * These are merged into definition.fields[].meta.translations.
 *
 * INVARIANT (no fallback): every VISIBLE field of every catalog section type
 * (prisma/seeds/section-type.seed.ts) must have an entry here covering every
 * LOCALE. A missing entry is a BUG — `injectFieldTranslations` throws at seed
 * time, the runtime resolver throws, and the parity specs in
 * `test/static-analysis/i18n/` fail. The `fieldKey`s here MUST match the
 * catalog field keys exactly — there is no English fallback to mask drift.
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
  field: {
    en: { label: 'Field of Study', placeholder: 'e.g., Computer Science, Engineering' },
    'pt-BR': { label: 'Área de Estudo', placeholder: 'ex: Ciência da Computação, Engenharia' },
  },
  degree: {
    en: { label: 'Degree', placeholder: "e.g., Bachelor's, Master's, PhD" },
    'pt-BR': { label: 'Grau', placeholder: 'ex: Bacharelado, Mestrado, Doutorado' },
  },
  degreeType: {
    en: { label: 'Degree Type' },
    'pt-BR': { label: 'Tipo de Diploma' },
  },
  startDate: {
    en: { label: 'Start Date' },
    'pt-BR': { label: 'Data de Início' },
  },
  endDate: {
    en: { label: 'End Date', helpText: 'Leave empty if still studying' },
    'pt-BR': { label: 'Data de Término', helpText: 'Deixe vazio se ainda está cursando' },
  },
  status: {
    en: { label: 'Status' },
    'pt-BR': { label: 'Situação' },
  },
  description: {
    en: { label: 'Description' },
    'pt-BR': { label: 'Descrição' },
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
};

// ============================================================================
// Soft Skills Fields
// ============================================================================

export const softSkillsFieldTranslations: FieldTranslationsMap = {
  name: {
    en: { label: 'Soft Skill', placeholder: 'e.g., Communication, Leadership' },
    'pt-BR': { label: 'Habilidade Comportamental', placeholder: 'ex: Comunicação, Liderança' },
  },
};

// ============================================================================
// Languages Fields
// ============================================================================

export const languageFieldTranslations: FieldTranslationsMap = {
  name: {
    en: { label: 'Language', placeholder: 'e.g., English, Spanish, Mandarin' },
    'pt-BR': { label: 'Idioma', placeholder: 'ex: Inglês, Espanhol, Mandarim' },
  },
  level: {
    en: { label: 'CEFR Level' },
    'pt-BR': { label: 'Nível (CEFR)' },
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
  repositoryUrl: {
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
  highlights: {
    en: { label: 'Key Highlights', placeholder: 'Add a highlight...' },
    'pt-BR': { label: 'Principais Destaques', placeholder: 'Adicione um destaque...' },
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
  proofUrl: {
    en: { label: 'Proof URL', placeholder: 'https://...' },
    'pt-BR': { label: 'URL do Comprovante', placeholder: 'https://...' },
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
    en: { label: 'Publisher / Journal' },
    'pt-BR': { label: 'Editora / Revista' },
  },
  date: {
    en: { label: 'Publication Date' },
    'pt-BR': { label: 'Data de Publicação' },
  },
  url: {
    en: { label: 'Publication URL', placeholder: 'https://...' },
    'pt-BR': { label: 'URL da Publicação', placeholder: 'https://...' },
  },
  description: {
    en: { label: 'Description' },
    'pt-BR': { label: 'Descrição' },
  },
};

// ============================================================================
// Interest Fields
// ============================================================================

export const interestFieldTranslations: FieldTranslationsMap = {
  name: {
    en: { label: 'Interest', placeholder: 'e.g., Photography, Chess, Hiking' },
    'pt-BR': { label: 'Interesse', placeholder: 'ex: Fotografia, Xadrez, Trilha' },
  },
  keywords: {
    en: { label: 'Keywords', placeholder: 'Add a keyword...' },
    'pt-BR': { label: 'Palavras-chave', placeholder: 'Adicione uma palavra-chave...' },
  },
};

// ============================================================================
// Recommendation Fields
// ============================================================================

export const recommendationFieldTranslations: FieldTranslationsMap = {
  name: {
    en: { label: 'Recommender Name', placeholder: 'e.g., Jane Smith' },
    'pt-BR': { label: 'Nome de Quem Recomenda', placeholder: 'ex: Maria Silva' },
  },
  role: {
    en: { label: 'Role / Title', placeholder: 'e.g., Engineering Manager' },
    'pt-BR': { label: 'Cargo / Título', placeholder: 'ex: Gerente de Engenharia' },
  },
  company: {
    en: { label: 'Company' },
    'pt-BR': { label: 'Empresa' },
  },
  email: {
    en: { label: 'Email', placeholder: 'name@company.com' },
    'pt-BR': { label: 'E-mail', placeholder: 'nome@empresa.com' },
  },
  phone: {
    en: { label: 'Phone' },
    'pt-BR': { label: 'Telefone' },
  },
  text: {
    en: { label: 'Recommendation Text', placeholder: 'Write the recommendation...' },
    'pt-BR': { label: 'Texto da Recomendação', placeholder: 'Escreva a recomendação...' },
  },
};

// ============================================================================
// Summary Fields
// ============================================================================

export const summaryFieldTranslations: FieldTranslationsMap = {
  text: {
    en: { label: 'Summary', placeholder: 'Write a short professional summary...' },
    'pt-BR': { label: 'Resumo', placeholder: 'Escreva um breve resumo profissional...' },
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
  organizer: {
    en: { label: 'Organizer' },
    'pt-BR': { label: 'Organizador' },
  },
  date: {
    en: { label: 'Date' },
    'pt-BR': { label: 'Data' },
  },
  projectName: {
    en: { label: 'Project Name' },
    'pt-BR': { label: 'Nome do Projeto' },
  },
  placement: {
    en: { label: 'Placement / Award', placeholder: 'e.g., 1st Place, Finalist' },
    'pt-BR': { label: 'Colocação / Prêmio', placeholder: 'ex: 1º Lugar, Finalista' },
  },
  description: {
    en: { label: 'Description' },
    'pt-BR': { label: 'Descrição' },
  },
  url: {
    en: { label: 'Project URL', placeholder: 'https://...' },
    'pt-BR': { label: 'URL do Projeto', placeholder: 'https://...' },
  },
};

// ============================================================================
// Open Source Fields
// ============================================================================

export const openSourceFieldTranslations: FieldTranslationsMap = {
  projectName: {
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
    en: { label: 'Repository URL', placeholder: 'https://github.com/...' },
    'pt-BR': { label: 'URL do Repositório', placeholder: 'https://github.com/...' },
  },
  startDate: {
    en: { label: 'Start Date' },
    'pt-BR': { label: 'Data de Início' },
  },
};

// ============================================================================
// Bug Bounty Fields
// ============================================================================

export const bugBountyFieldTranslations: FieldTranslationsMap = {
  platform: {
    en: { label: 'Platform / Company', placeholder: 'e.g., Google VRP, HackerOne' },
    'pt-BR': { label: 'Plataforma / Empresa', placeholder: 'ex: Google VRP, HackerOne' },
  },
  severity: {
    en: { label: 'Severity' },
    'pt-BR': { label: 'Severidade' },
  },
  date: {
    en: { label: 'Date Reported' },
    'pt-BR': { label: 'Data do Reporte' },
  },
  description: {
    en: { label: 'Description' },
    'pt-BR': { label: 'Descrição' },
  },
  reward: {
    en: { label: 'Reward', placeholder: 'e.g., $5,000' },
    'pt-BR': { label: 'Recompensa', placeholder: 'ex: US$ 5.000' },
  },
  url: {
    en: { label: 'Reference URL', placeholder: 'https://...' },
    'pt-BR': { label: 'URL de Referência', placeholder: 'https://...' },
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
    en: { label: 'Event / Conference', placeholder: 'e.g., JSConf, ReactConf' },
    'pt-BR': { label: 'Evento / Conferência', placeholder: 'ex: JSConf, ReactConf' },
  },
  date: {
    en: { label: 'Date' },
    'pt-BR': { label: 'Data' },
  },
  location: {
    en: { label: 'Location', placeholder: 'e.g., São Paulo, Remote' },
    'pt-BR': { label: 'Local', placeholder: 'ex: São Paulo, Remoto' },
  },
  description: {
    en: { label: 'Description' },
    'pt-BR': { label: 'Descrição' },
  },
  url: {
    en: { label: 'Recording / Slides URL', placeholder: 'https://...' },
    'pt-BR': { label: 'URL da Gravação / Slides', placeholder: 'https://...' },
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

// ============================================================================
// Links Fields (links_v1) — `domain` is hidden, so it needs no translation.
// ============================================================================

export const linksFieldTranslations: FieldTranslationsMap = {
  kind: {
    en: { label: 'Link type' },
    'pt-BR': { label: 'Tipo de link' },
  },
  url: {
    en: { label: 'URL', placeholder: 'e.g., https://github.com/you' },
    'pt-BR': { label: 'Endereço', placeholder: 'ex: https://github.com/voce' },
  },
  label: {
    en: { label: 'Label', placeholder: 'e.g., My blog' },
    'pt-BR': { label: 'Rótulo', placeholder: 'ex: Meu blog' },
  },
};

export const allFieldTranslations: Record<string, FieldTranslationsMap> = {
  work_experience_v1: workExperienceFieldTranslations,
  education_v1: educationFieldTranslations,
  skill_set_v1: skillsFieldTranslations,
  soft_skill_set_v1: softSkillsFieldTranslations,
  language_v1: languageFieldTranslations,
  certification_v1: certificationFieldTranslations,
  project_v1: projectFieldTranslations,
  award_v1: awardFieldTranslations,
  publication_v1: publicationFieldTranslations,
  interest_v1: interestFieldTranslations,
  recommendation_v1: recommendationFieldTranslations,
  summary_v1: summaryFieldTranslations,
  hackathon_v1: hackathonFieldTranslations,
  open_source_v1: openSourceFieldTranslations,
  bug_bounty_v1: bugBountyFieldTranslations,
  talk_v1: talkFieldTranslations,
  achievement_v1: achievementFieldTranslations,
  links_v1: linksFieldTranslations,
};

for (const [sectionKey, map] of Object.entries(allFieldTranslations)) {
  assertLocalesParity(sectionKey, map);
}

/**
 * Inject field translations into a section-type definition at seed time.
 *
 * No fallback: every VISIBLE field (`meta.hidden !== true`) MUST have a
 * translation entry whose key matches the field key. A missing entry throws
 * so the seed fails loudly instead of shipping a field that renders its raw
 * English `meta.label`. Hidden fields are never displayed, so they are exempt.
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
  if (!definition.fields) return definition;
  const translations = allFieldTranslations[sectionTypeKey];

  const enrichField = (field: {
    key?: string;
    meta?: Record<string, unknown>;
    fields?: unknown[];
    items?: unknown;
  }) => {
    if (!field.key) return field;
    if (field.meta?.hidden === true) return field;

    const fieldTranslations = translations?.[field.key];
    if (!fieldTranslations) {
      throw new Error(
        `[field-translations] '${sectionTypeKey}.${field.key}' has no translation entry. ` +
          `Every visible catalog field must be translated for all locales — no English fallback. ` +
          `Add it to prisma/seeds/field-translations.ts.`,
      );
    }

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
