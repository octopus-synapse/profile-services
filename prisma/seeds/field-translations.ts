/**
 * Field-Level Translations
 *
 * Translations for field labels within section type definitions.
 * Structure: { [fieldKey]: { [locale]: { label, placeholder?, helpText? } } }
 *
 * These are merged into definition.fields[].meta.translations
 */

export interface FieldTranslation {
  label?: string;
  placeholder?: string;
  helpText?: string;
}

export type FieldTranslationsMap = Record<string, Record<string, FieldTranslation>>;

// ============================================================================
// Work Experience Fields
// ============================================================================

export const workExperienceFieldTranslations: FieldTranslationsMap = {
  company: {
    en: { label: 'Company', placeholder: 'e.g., Google, Meta, Startup XYZ' },
    'pt-BR': { label: 'Empresa', placeholder: 'ex: Google, Meta, Startup XYZ' },
    es: { label: 'Empresa', placeholder: 'ej: Google, Meta, Startup XYZ' },
  },
  role: {
    en: { label: 'Role', placeholder: 'e.g., Software Engineer, Product Manager' },
    'pt-BR': { label: 'Cargo', placeholder: 'ex: Engenheiro de Software, Product Manager' },
    es: { label: 'Cargo', placeholder: 'ej: Ingeniero de Software, Product Manager' },
  },
  employmentType: {
    en: { label: 'Employment Type' },
    'pt-BR': { label: 'Tipo de Emprego' },
    es: { label: 'Tipo de Empleo' },
  },
  startDate: {
    en: { label: 'Start Date' },
    'pt-BR': { label: 'Data de Início' },
    es: { label: 'Fecha de Inicio' },
  },
  endDate: {
    en: { label: 'End Date', helpText: 'Leave empty if currently working here' },
    'pt-BR': { label: 'Data de Término', helpText: 'Deixe vazio se ainda trabalha aqui' },
    es: { label: 'Fecha de Fin', helpText: 'Deja vacío si actualmente trabajas aquí' },
  },
  description: {
    en: { label: 'Description', placeholder: 'Describe your responsibilities and achievements...' },
    'pt-BR': {
      label: 'Descrição',
      placeholder: 'Descreva suas responsabilidades e conquistas...',
    },
    es: { label: 'Descripción', placeholder: 'Describe tus responsabilidades y logros...' },
  },
  achievements: {
    en: { label: 'Key Achievements', placeholder: 'Add an achievement...' },
    'pt-BR': { label: 'Principais Conquistas', placeholder: 'Adicione uma conquista...' },
    es: { label: 'Logros Principales', placeholder: 'Agrega un logro...' },
  },
};

// ============================================================================
// Education Fields
// ============================================================================

export const educationFieldTranslations: FieldTranslationsMap = {
  institution: {
    en: { label: 'Institution', placeholder: 'e.g., MIT, Stanford University' },
    'pt-BR': { label: 'Instituição', placeholder: 'ex: USP, UNICAMP, PUC' },
    es: { label: 'Institución', placeholder: 'ej: UNAM, Tecnológico de Monterrey' },
  },
  degree: {
    en: { label: 'Degree', placeholder: "e.g., Bachelor's, Master's, PhD" },
    'pt-BR': { label: 'Grau', placeholder: 'ex: Bacharelado, Mestrado, Doutorado' },
    es: { label: 'Título', placeholder: 'ej: Licenciatura, Maestría, Doctorado' },
  },
  field: {
    en: { label: 'Field of Study', placeholder: 'e.g., Computer Science, Engineering' },
    'pt-BR': { label: 'Área de Estudo', placeholder: 'ex: Ciência da Computação, Engenharia' },
    es: { label: 'Campo de Estudio', placeholder: 'ej: Ciencias de la Computación, Ingeniería' },
  },
  startDate: {
    en: { label: 'Start Date' },
    'pt-BR': { label: 'Data de Início' },
    es: { label: 'Fecha de Inicio' },
  },
  endDate: {
    en: { label: 'End Date', helpText: 'Leave empty if still studying' },
    'pt-BR': { label: 'Data de Término', helpText: 'Deixe vazio se ainda está cursando' },
    es: { label: 'Fecha de Fin', helpText: 'Deja vacío si aún estás estudiando' },
  },
  gpa: {
    en: { label: 'GPA', placeholder: 'e.g., 3.8/4.0' },
    'pt-BR': { label: 'Média/CR', placeholder: 'ex: 8.5/10' },
    es: { label: 'Promedio', placeholder: 'ej: 9.0/10' },
  },
  activities: {
    en: { label: 'Activities & Societies' },
    'pt-BR': { label: 'Atividades e Organizações' },
    es: { label: 'Actividades y Sociedades' },
  },
};

// ============================================================================
// Skills Fields
// ============================================================================

export const skillsFieldTranslations: FieldTranslationsMap = {
  name: {
    en: { label: 'Skill Name', placeholder: 'e.g., TypeScript, React, AWS' },
    'pt-BR': { label: 'Nome da Habilidade', placeholder: 'ex: TypeScript, React, AWS' },
    es: { label: 'Nombre de la Habilidad', placeholder: 'ej: TypeScript, React, AWS' },
  },
  category: {
    en: { label: 'Category', placeholder: 'e.g., Frontend, Backend, DevOps' },
    'pt-BR': { label: 'Categoria', placeholder: 'ex: Frontend, Backend, DevOps' },
    es: { label: 'Categoría', placeholder: 'ej: Frontend, Backend, DevOps' },
  },
  level: {
    en: { label: 'Proficiency Level' },
    'pt-BR': { label: 'Nível de Proficiência' },
    es: { label: 'Nivel de Competencia' },
  },
  yearsOfExperience: {
    en: { label: 'Years of Experience' },
    'pt-BR': { label: 'Anos de Experiência' },
    es: { label: 'Años de Experiencia' },
  },
};

// ============================================================================
// Languages Fields
// ============================================================================

export const languageFieldTranslations: FieldTranslationsMap = {
  language: {
    en: { label: 'Language', placeholder: 'e.g., English, Spanish, Mandarin' },
    'pt-BR': { label: 'Idioma', placeholder: 'ex: Inglês, Espanhol, Mandarim' },
    es: { label: 'Idioma', placeholder: 'ej: Inglés, Español, Mandarín' },
  },
  proficiency: {
    en: { label: 'Proficiency Level' },
    'pt-BR': { label: 'Nível de Proficiência' },
    es: { label: 'Nivel de Competencia' },
  },
  certification: {
    en: { label: 'Certification', placeholder: 'e.g., TOEFL, IELTS, DELE' },
    'pt-BR': { label: 'Certificação', placeholder: 'ex: TOEFL, IELTS, DELE' },
    es: { label: 'Certificación', placeholder: 'ej: TOEFL, IELTS, DELE' },
  },
};

// ============================================================================
// Certification Fields
// ============================================================================

export const certificationFieldTranslations: FieldTranslationsMap = {
  name: {
    en: { label: 'Certification Name', placeholder: 'e.g., AWS Solutions Architect' },
    'pt-BR': { label: 'Nome da Certificação', placeholder: 'ex: AWS Solutions Architect' },
    es: { label: 'Nombre de la Certificación', placeholder: 'ej: AWS Solutions Architect' },
  },
  issuer: {
    en: { label: 'Issuing Organization', placeholder: 'e.g., Amazon Web Services' },
    'pt-BR': { label: 'Organização Emissora', placeholder: 'ex: Amazon Web Services' },
    es: { label: 'Organización Emisora', placeholder: 'ej: Amazon Web Services' },
  },
  issueDate: {
    en: { label: 'Issue Date' },
    'pt-BR': { label: 'Data de Emissão' },
    es: { label: 'Fecha de Emisión' },
  },
  expiryDate: {
    en: { label: 'Expiry Date', helpText: 'Leave empty if no expiration' },
    'pt-BR': { label: 'Data de Expiração', helpText: 'Deixe vazio se não expira' },
    es: { label: 'Fecha de Expiración', helpText: 'Deja vacío si no expira' },
  },
  credentialId: {
    en: { label: 'Credential ID', placeholder: 'e.g., ABC123XYZ' },
    'pt-BR': { label: 'ID da Credencial', placeholder: 'ex: ABC123XYZ' },
    es: { label: 'ID de la Credencial', placeholder: 'ej: ABC123XYZ' },
  },
  credentialUrl: {
    en: { label: 'Credential URL', placeholder: 'https://...' },
    'pt-BR': { label: 'URL da Credencial', placeholder: 'https://...' },
    es: { label: 'URL de la Credencial', placeholder: 'https://...' },
  },
};

// ============================================================================
// Project Fields
// ============================================================================

export const projectFieldTranslations: FieldTranslationsMap = {
  name: {
    en: { label: 'Project Name', placeholder: 'e.g., E-commerce Platform' },
    'pt-BR': { label: 'Nome do Projeto', placeholder: 'ex: Plataforma de E-commerce' },
    es: { label: 'Nombre del Proyecto', placeholder: 'ej: Plataforma de E-commerce' },
  },
  description: {
    en: { label: 'Description', placeholder: 'Describe your project...' },
    'pt-BR': { label: 'Descrição', placeholder: 'Descreva seu projeto...' },
    es: { label: 'Descripción', placeholder: 'Describe tu proyecto...' },
  },
  url: {
    en: { label: 'Project URL', placeholder: 'https://...' },
    'pt-BR': { label: 'URL do Projeto', placeholder: 'https://...' },
    es: { label: 'URL del Proyecto', placeholder: 'https://...' },
  },
  repository: {
    en: { label: 'Repository URL', placeholder: 'https://github.com/...' },
    'pt-BR': { label: 'URL do Repositório', placeholder: 'https://github.com/...' },
    es: { label: 'URL del Repositorio', placeholder: 'https://github.com/...' },
  },
  startDate: {
    en: { label: 'Start Date' },
    'pt-BR': { label: 'Data de Início' },
    es: { label: 'Fecha de Inicio' },
  },
  endDate: {
    en: { label: 'End Date' },
    'pt-BR': { label: 'Data de Término' },
    es: { label: 'Fecha de Fin' },
  },
  technologies: {
    en: { label: 'Technologies Used', placeholder: 'Add a technology...' },
    'pt-BR': { label: 'Tecnologias Utilizadas', placeholder: 'Adicione uma tecnologia...' },
    es: { label: 'Tecnologías Utilizadas', placeholder: 'Agrega una tecnología...' },
  },
};

// ============================================================================
// Award Fields
// ============================================================================

export const awardFieldTranslations: FieldTranslationsMap = {
  title: {
    en: { label: 'Award Title', placeholder: 'e.g., Employee of the Year' },
    'pt-BR': { label: 'Título do Prêmio', placeholder: 'ex: Funcionário do Ano' },
    es: { label: 'Título del Premio', placeholder: 'ej: Empleado del Año' },
  },
  issuer: {
    en: { label: 'Issuing Organization' },
    'pt-BR': { label: 'Organização Emissora' },
    es: { label: 'Organización Emisora' },
  },
  date: {
    en: { label: 'Date Received' },
    'pt-BR': { label: 'Data de Recebimento' },
    es: { label: 'Fecha de Recepción' },
  },
  description: {
    en: { label: 'Description' },
    'pt-BR': { label: 'Descrição' },
    es: { label: 'Descripción' },
  },
};

// ============================================================================
// Volunteer Experience Fields
// ============================================================================

export const volunteerFieldTranslations: FieldTranslationsMap = {
  organization: {
    en: { label: 'Organization', placeholder: 'e.g., Red Cross, Local Food Bank' },
    'pt-BR': { label: 'Organização', placeholder: 'ex: Cruz Vermelha, Banco de Alimentos' },
    es: { label: 'Organización', placeholder: 'ej: Cruz Roja, Banco de Alimentos' },
  },
  role: {
    en: { label: 'Role', placeholder: 'e.g., Volunteer Coordinator' },
    'pt-BR': { label: 'Cargo', placeholder: 'ex: Coordenador Voluntário' },
    es: { label: 'Cargo', placeholder: 'ej: Coordinador Voluntario' },
  },
  startDate: {
    en: { label: 'Start Date' },
    'pt-BR': { label: 'Data de Início' },
    es: { label: 'Fecha de Inicio' },
  },
  endDate: {
    en: { label: 'End Date' },
    'pt-BR': { label: 'Data de Término' },
    es: { label: 'Fecha de Fin' },
  },
  description: {
    en: { label: 'Description' },
    'pt-BR': { label: 'Descrição' },
    es: { label: 'Descripción' },
  },
};

// ============================================================================
// Publication Fields
// ============================================================================

export const publicationFieldTranslations: FieldTranslationsMap = {
  title: {
    en: { label: 'Publication Title' },
    'pt-BR': { label: 'Título da Publicação' },
    es: { label: 'Título de la Publicación' },
  },
  publisher: {
    en: { label: 'Publisher/Journal' },
    'pt-BR': { label: 'Editora/Revista' },
    es: { label: 'Editorial/Revista' },
  },
  date: {
    en: { label: 'Publication Date' },
    'pt-BR': { label: 'Data de Publicação' },
    es: { label: 'Fecha de Publicación' },
  },
  url: {
    en: { label: 'URL' },
    'pt-BR': { label: 'URL' },
    es: { label: 'URL' },
  },
  summary: {
    en: { label: 'Summary' },
    'pt-BR': { label: 'Resumo' },
    es: { label: 'Resumen' },
  },
};

// ============================================================================
// Hackathon Fields
// ============================================================================

export const hackathonFieldTranslations: FieldTranslationsMap = {
  name: {
    en: { label: 'Hackathon Name', placeholder: 'e.g., ETHGlobal, Junction' },
    'pt-BR': { label: 'Nome do Hackathon', placeholder: 'ex: ETHGlobal, Junction' },
    es: { label: 'Nombre del Hackathon', placeholder: 'ej: ETHGlobal, Junction' },
  },
  project: {
    en: { label: 'Project Name' },
    'pt-BR': { label: 'Nome do Projeto' },
    es: { label: 'Nombre del Proyecto' },
  },
  date: {
    en: { label: 'Date' },
    'pt-BR': { label: 'Data' },
    es: { label: 'Fecha' },
  },
  result: {
    en: { label: 'Result', placeholder: 'e.g., 1st Place, Finalist' },
    'pt-BR': { label: 'Resultado', placeholder: 'ex: 1º Lugar, Finalista' },
    es: { label: 'Resultado', placeholder: 'ej: 1er Lugar, Finalista' },
  },
  description: {
    en: { label: 'Description' },
    'pt-BR': { label: 'Descrição' },
    es: { label: 'Descripción' },
  },
  url: {
    en: { label: 'Project URL' },
    'pt-BR': { label: 'URL do Projeto' },
    es: { label: 'URL del Proyecto' },
  },
};

// ============================================================================
// Open Source Fields
// ============================================================================

export const openSourceFieldTranslations: FieldTranslationsMap = {
  project: {
    en: { label: 'Project Name', placeholder: 'e.g., React, Vue, Node.js' },
    'pt-BR': { label: 'Nome do Projeto', placeholder: 'ex: React, Vue, Node.js' },
    es: { label: 'Nombre del Proyecto', placeholder: 'ej: React, Vue, Node.js' },
  },
  role: {
    en: { label: 'Role', placeholder: 'e.g., Contributor, Maintainer' },
    'pt-BR': { label: 'Papel', placeholder: 'ex: Contribuidor, Mantenedor' },
    es: { label: 'Rol', placeholder: 'ej: Contribuidor, Mantenedor' },
  },
  description: {
    en: { label: 'Description' },
    'pt-BR': { label: 'Descrição' },
    es: { label: 'Descripción' },
  },
  url: {
    en: { label: 'Repository URL' },
    'pt-BR': { label: 'URL do Repositório' },
    es: { label: 'URL del Repositorio' },
  },
};

// ============================================================================
// Bug Bounty Fields
// ============================================================================

export const bugBountyFieldTranslations: FieldTranslationsMap = {
  program: {
    en: { label: 'Program Name', placeholder: 'e.g., Google VRP, HackerOne' },
    'pt-BR': { label: 'Nome do Programa', placeholder: 'ex: Google VRP, HackerOne' },
    es: { label: 'Nombre del Programa', placeholder: 'ej: Google VRP, HackerOne' },
  },
  severity: {
    en: { label: 'Severity' },
    'pt-BR': { label: 'Severidade' },
    es: { label: 'Severidad' },
  },
  date: {
    en: { label: 'Date Reported' },
    'pt-BR': { label: 'Data do Reporte' },
    es: { label: 'Fecha del Reporte' },
  },
  cve: {
    en: { label: 'CVE ID', placeholder: 'e.g., CVE-2023-XXXX' },
    'pt-BR': { label: 'ID CVE', placeholder: 'ex: CVE-2023-XXXX' },
    es: { label: 'ID CVE', placeholder: 'ej: CVE-2023-XXXX' },
  },
  description: {
    en: { label: 'Description' },
    'pt-BR': { label: 'Descrição' },
    es: { label: 'Descripción' },
  },
};

// ============================================================================
// Talk Fields
// ============================================================================

export const talkFieldTranslations: FieldTranslationsMap = {
  title: {
    en: { label: 'Talk Title' },
    'pt-BR': { label: 'Título da Palestra' },
    es: { label: 'Título de la Charla' },
  },
  event: {
    en: { label: 'Event/Conference', placeholder: 'e.g., JSConf, ReactConf' },
    'pt-BR': { label: 'Evento/Conferência', placeholder: 'ex: JSConf, ReactConf' },
    es: { label: 'Evento/Conferencia', placeholder: 'ej: JSConf, ReactConf' },
  },
  date: {
    en: { label: 'Date' },
    'pt-BR': { label: 'Data' },
    es: { label: 'Fecha' },
  },
  description: {
    en: { label: 'Description' },
    'pt-BR': { label: 'Descrição' },
    es: { label: 'Descripción' },
  },
  slidesUrl: {
    en: { label: 'Slides URL' },
    'pt-BR': { label: 'URL dos Slides' },
    es: { label: 'URL de los Slides' },
  },
  videoUrl: {
    en: { label: 'Video URL' },
    'pt-BR': { label: 'URL do Vídeo' },
    es: { label: 'URL del Video' },
  },
};

// ============================================================================
// Achievement Fields
// ============================================================================

export const achievementFieldTranslations: FieldTranslationsMap = {
  title: {
    en: { label: 'Achievement Title' },
    'pt-BR': { label: 'Título da Conquista' },
    es: { label: 'Título del Logro' },
  },
  date: {
    en: { label: 'Date' },
    'pt-BR': { label: 'Data' },
    es: { label: 'Fecha' },
  },
  description: {
    en: { label: 'Description' },
    'pt-BR': { label: 'Descrição' },
    es: { label: 'Descripción' },
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
