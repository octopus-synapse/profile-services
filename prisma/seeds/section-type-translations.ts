/**
 * Section Type Translations
 *
 * Translations for section types in all supported locales.
 * Structure: { [sectionTypeKey]: { [locale]: TranslationData } }
 */

export interface SectionTypeTranslation {
  title: string;
  description: string;
  label: string; // Short label for UI (e.g., "work", "edu")
  noDataLabel: string; // Message when user has no data for this section
  placeholder: string; // Placeholder text for inputs
  addLabel: string; // "Add Experience", "Add Education", etc.
}

export type SectionTypeTranslations = {
  [locale: string]: SectionTypeTranslation;
};

export const sectionTypeTranslations: Record<string, SectionTypeTranslations> = {
  work_experience_v1: {
    en: {
      title: 'Work Experience',
      description: 'Professional work history and employment',
      label: 'work',
      noDataLabel: "I don't have work experience to add right now",
      placeholder: 'Add your professional experience...',
      addLabel: 'Add Experience',
    },
    'pt-BR': {
      title: 'Experiência Profissional',
      description: 'Histórico de trabalho e empregos',
      label: 'trabalho',
      noDataLabel: 'Não tenho experiência profissional para adicionar agora',
      placeholder: 'Adicione sua experiência profissional...',
      addLabel: 'Adicionar Experiência',
    },
    es: {
      title: 'Experiencia Laboral',
      description: 'Historial de trabajo y empleo',
      label: 'trabajo',
      noDataLabel: 'No tengo experiencia laboral para agregar ahora',
      placeholder: 'Agrega tu experiencia profesional...',
      addLabel: 'Agregar Experiencia',
    },
  },

  education_v1: {
    en: {
      title: 'Education',
      description: 'Academic history and qualifications',
      label: 'edu',
      noDataLabel: "I don't have education to add right now",
      placeholder: 'Add your education...',
      addLabel: 'Add Education',
    },
    'pt-BR': {
      title: 'Formação Acadêmica',
      description: 'Histórico acadêmico e qualificações',
      label: 'formação',
      noDataLabel: 'Não tenho formação acadêmica para adicionar agora',
      placeholder: 'Adicione sua formação acadêmica...',
      addLabel: 'Adicionar Formação',
    },
    es: {
      title: 'Educación',
      description: 'Historial académico y calificaciones',
      label: 'educación',
      noDataLabel: 'No tengo educación para agregar ahora',
      placeholder: 'Agrega tu educación...',
      addLabel: 'Agregar Educación',
    },
  },

  skill_set_v1: {
    en: {
      title: 'Skills',
      description: 'Technical and professional skills',
      label: 'skills',
      noDataLabel: "I'm still developing my skills",
      placeholder: 'Add your skills...',
      addLabel: 'Add Skill',
    },
    'pt-BR': {
      title: 'Habilidades',
      description: 'Habilidades técnicas e profissionais',
      label: 'habilidades',
      noDataLabel: 'Ainda estou desenvolvendo minhas habilidades',
      placeholder: 'Adicione suas habilidades...',
      addLabel: 'Adicionar Habilidade',
    },
    es: {
      title: 'Habilidades',
      description: 'Habilidades técnicas y profesionales',
      label: 'habilidades',
      noDataLabel: 'Todavía estoy desarrollando mis habilidades',
      placeholder: 'Agrega tus habilidades...',
      addLabel: 'Agregar Habilidad',
    },
  },

  language_v1: {
    en: {
      title: 'Languages',
      description: 'Spoken languages and proficiency levels',
      label: 'languages',
      noDataLabel: "I don't have additional languages to add",
      placeholder: 'Add languages you speak...',
      addLabel: 'Add Language',
    },
    'pt-BR': {
      title: 'Idiomas',
      description: 'Idiomas falados e níveis de proficiência',
      label: 'idiomas',
      noDataLabel: 'Não tenho idiomas adicionais para adicionar',
      placeholder: 'Adicione os idiomas que você fala...',
      addLabel: 'Adicionar Idioma',
    },
    es: {
      title: 'Idiomas',
      description: 'Idiomas hablados y niveles de competencia',
      label: 'idiomas',
      noDataLabel: 'No tengo idiomas adicionales para agregar',
      placeholder: 'Agrega los idiomas que hablas...',
      addLabel: 'Agregar Idioma',
    },
  },

  certification_v1: {
    en: {
      title: 'Certifications',
      description: 'Professional certifications and credentials',
      label: 'certs',
      noDataLabel: "I don't have certifications to add",
      placeholder: 'Add your certifications...',
      addLabel: 'Add Certification',
    },
    'pt-BR': {
      title: 'Certificações',
      description: 'Certificações e credenciais profissionais',
      label: 'certificações',
      noDataLabel: 'Não tenho certificações para adicionar',
      placeholder: 'Adicione suas certificações...',
      addLabel: 'Adicionar Certificação',
    },
    es: {
      title: 'Certificaciones',
      description: 'Certificaciones y credenciales profesionales',
      label: 'certificaciones',
      noDataLabel: 'No tengo certificaciones para agregar',
      placeholder: 'Agrega tus certificaciones...',
      addLabel: 'Agregar Certificación',
    },
  },

  project_v1: {
    en: {
      title: 'Projects',
      description: 'Personal and professional projects',
      label: 'projects',
      noDataLabel: "I don't have projects to add right now",
      placeholder: 'Add your projects...',
      addLabel: 'Add Project',
    },
    'pt-BR': {
      title: 'Projetos',
      description: 'Projetos pessoais e profissionais',
      label: 'projetos',
      noDataLabel: 'Não tenho projetos para adicionar agora',
      placeholder: 'Adicione seus projetos...',
      addLabel: 'Adicionar Projeto',
    },
    es: {
      title: 'Proyectos',
      description: 'Proyectos personales y profesionales',
      label: 'proyectos',
      noDataLabel: 'No tengo proyectos para agregar ahora',
      placeholder: 'Agrega tus proyectos...',
      addLabel: 'Agregar Proyecto',
    },
  },

  publication_v1: {
    en: {
      title: 'Publications',
      description: 'Academic and professional publications',
      label: 'publications',
      noDataLabel: "I don't have publications to add",
      placeholder: 'Add your publications...',
      addLabel: 'Add Publication',
    },
    'pt-BR': {
      title: 'Publicações',
      description: 'Publicações acadêmicas e profissionais',
      label: 'publicações',
      noDataLabel: 'Não tenho publicações para adicionar',
      placeholder: 'Adicione suas publicações...',
      addLabel: 'Adicionar Publicação',
    },
    es: {
      title: 'Publicaciones',
      description: 'Publicaciones académicas y profesionales',
      label: 'publicaciones',
      noDataLabel: 'No tengo publicaciones para agregar',
      placeholder: 'Agrega tus publicaciones...',
      addLabel: 'Agregar Publicación',
    },
  },

  award_v1: {
    en: {
      title: 'Awards',
      description: 'Awards and recognitions received',
      label: 'awards',
      noDataLabel: "I don't have awards to add",
      placeholder: 'Add your awards...',
      addLabel: 'Add Award',
    },
    'pt-BR': {
      title: 'Prêmios',
      description: 'Prêmios e reconhecimentos recebidos',
      label: 'prêmios',
      noDataLabel: 'Não tenho prêmios para adicionar',
      placeholder: 'Adicione seus prêmios...',
      addLabel: 'Adicionar Prêmio',
    },
    es: {
      title: 'Premios',
      description: 'Premios y reconocimientos recibidos',
      label: 'premios',
      noDataLabel: 'No tengo premios para agregar',
      placeholder: 'Agrega tus premios...',
      addLabel: 'Agregar Premio',
    },
  },

  volunteer_v1: {
    en: {
      title: 'Volunteer Experience',
      description: 'Volunteer work and community service',
      label: 'volunteer',
      noDataLabel: "I don't have volunteer experience to add",
      placeholder: 'Add your volunteer experience...',
      addLabel: 'Add Volunteer Experience',
    },
    'pt-BR': {
      title: 'Trabalho Voluntário',
      description: 'Trabalho voluntário e serviço comunitário',
      label: 'voluntariado',
      noDataLabel: 'Não tenho experiência voluntária para adicionar',
      placeholder: 'Adicione seu trabalho voluntário...',
      addLabel: 'Adicionar Voluntariado',
    },
    es: {
      title: 'Experiencia Voluntaria',
      description: 'Trabajo voluntario y servicio comunitario',
      label: 'voluntariado',
      noDataLabel: 'No tengo experiencia voluntaria para agregar',
      placeholder: 'Agrega tu experiencia voluntaria...',
      addLabel: 'Agregar Voluntariado',
    },
  },

  open_source_v1: {
    en: {
      title: 'Open Source Contributions',
      description: 'Contributions to open source projects',
      label: 'open source',
      noDataLabel: "I don't have open source contributions to add",
      placeholder: 'Add your open source contributions...',
      addLabel: 'Add Contribution',
    },
    'pt-BR': {
      title: 'Contribuições Open Source',
      description: 'Contribuições para projetos de código aberto',
      label: 'open source',
      noDataLabel: 'Não tenho contribuições open source para adicionar',
      placeholder: 'Adicione suas contribuições open source...',
      addLabel: 'Adicionar Contribuição',
    },
    es: {
      title: 'Contribuciones Open Source',
      description: 'Contribuciones a proyectos de código abierto',
      label: 'open source',
      noDataLabel: 'No tengo contribuciones open source para agregar',
      placeholder: 'Agrega tus contribuciones open source...',
      addLabel: 'Agregar Contribución',
    },
  },

  bug_bounty_v1: {
    en: {
      title: 'Bug Bounties',
      description: 'Security vulnerabilities discovered',
      label: 'bug bounty',
      noDataLabel: "I don't have bug bounties to add",
      placeholder: 'Add your bug bounty findings...',
      addLabel: 'Add Bug Bounty',
    },
    'pt-BR': {
      title: 'Bug Bounties',
      description: 'Vulnerabilidades de segurança descobertas',
      label: 'bug bounty',
      noDataLabel: 'Não tenho bug bounties para adicionar',
      placeholder: 'Adicione seus bug bounties...',
      addLabel: 'Adicionar Bug Bounty',
    },
    es: {
      title: 'Bug Bounties',
      description: 'Vulnerabilidades de seguridad descubiertas',
      label: 'bug bounty',
      noDataLabel: 'No tengo bug bounties para agregar',
      placeholder: 'Agrega tus bug bounties...',
      addLabel: 'Agregar Bug Bounty',
    },
  },

  hackathon_v1: {
    en: {
      title: 'Hackathons',
      description: 'Hackathon participations and wins',
      label: 'hackathons',
      noDataLabel: "I don't have hackathon experience to add",
      placeholder: 'Add your hackathon experience...',
      addLabel: 'Add Hackathon',
    },
    'pt-BR': {
      title: 'Hackathons',
      description: 'Participações e vitórias em hackathons',
      label: 'hackathons',
      noDataLabel: 'Não tenho experiência em hackathons para adicionar',
      placeholder: 'Adicione sua experiência em hackathons...',
      addLabel: 'Adicionar Hackathon',
    },
    es: {
      title: 'Hackathons',
      description: 'Participaciones y victorias en hackathons',
      label: 'hackathons',
      noDataLabel: 'No tengo experiencia en hackathons para agregar',
      placeholder: 'Agrega tu experiencia en hackathons...',
      addLabel: 'Agregar Hackathon',
    },
  },

  talk_v1: {
    en: {
      title: 'Talks & Presentations',
      description: 'Conference talks and presentations',
      label: 'talks',
      noDataLabel: "I don't have talks to add",
      placeholder: 'Add your talks and presentations...',
      addLabel: 'Add Talk',
    },
    'pt-BR': {
      title: 'Palestras e Apresentações',
      description: 'Palestras e apresentações em conferências',
      label: 'palestras',
      noDataLabel: 'Não tenho palestras para adicionar',
      placeholder: 'Adicione suas palestras e apresentações...',
      addLabel: 'Adicionar Palestra',
    },
    es: {
      title: 'Charlas y Presentaciones',
      description: 'Charlas y presentaciones en conferencias',
      label: 'charlas',
      noDataLabel: 'No tengo charlas para agregar',
      placeholder: 'Agrega tus charlas y presentaciones...',
      addLabel: 'Agregar Charla',
    },
  },

  achievement_v1: {
    en: {
      title: 'Achievements',
      description: 'Notable achievements and accomplishments',
      label: 'achievements',
      noDataLabel: "I don't have achievements to add",
      placeholder: 'Add your achievements...',
      addLabel: 'Add Achievement',
    },
    'pt-BR': {
      title: 'Conquistas',
      description: 'Conquistas e realizações notáveis',
      label: 'conquistas',
      noDataLabel: 'Não tenho conquistas para adicionar',
      placeholder: 'Adicione suas conquistas...',
      addLabel: 'Adicionar Conquista',
    },
    es: {
      title: 'Logros',
      description: 'Logros y realizaciones notables',
      label: 'logros',
      noDataLabel: 'No tengo logros para agregar',
      placeholder: 'Agrega tus logros...',
      addLabel: 'Agregar Logro',
    },
  },

  summary_v1: {
    en: {
      title: 'Professional Summary',
      description: 'Brief overview of your professional profile',
      label: 'summary',
      noDataLabel: "I don't have a summary to add",
      placeholder: 'Write a brief summary of your profile...',
      addLabel: 'Add Summary',
    },
    'pt-BR': {
      title: 'Resumo Profissional',
      description: 'Visão geral do seu perfil profissional',
      label: 'resumo',
      noDataLabel: 'Não tenho resumo para adicionar',
      placeholder: 'Escreva um breve resumo do seu perfil...',
      addLabel: 'Adicionar Resumo',
    },
    es: {
      title: 'Resumen Profesional',
      description: 'Visión general de tu perfil profesional',
      label: 'resumen',
      noDataLabel: 'No tengo resumen para agregar',
      placeholder: 'Escribe un breve resumen de tu perfil...',
      addLabel: 'Agregar Resumen',
    },
  },

  interest_v1: {
    en: {
      title: 'Interests',
      description: 'Personal interests and hobbies',
      label: 'interests',
      noDataLabel: "I don't have interests to add",
      placeholder: 'Add your interests...',
      addLabel: 'Add Interest',
    },
    'pt-BR': {
      title: 'Interesses',
      description: 'Interesses pessoais e hobbies',
      label: 'interesses',
      noDataLabel: 'Não tenho interesses para adicionar',
      placeholder: 'Adicione seus interesses...',
      addLabel: 'Adicionar Interesse',
    },
    es: {
      title: 'Intereses',
      description: 'Intereses personales y pasatiempos',
      label: 'intereses',
      noDataLabel: 'No tengo intereses para agregar',
      placeholder: 'Agrega tus intereses...',
      addLabel: 'Agregar Interés',
    },
  },

  recommendation_v1: {
    en: {
      title: 'Recommendations',
      description: 'Professional recommendations and endorsements',
      label: 'recommendations',
      noDataLabel: "I don't have recommendations to add",
      placeholder: 'Add your recommendations...',
      addLabel: 'Add Recommendation',
    },
    'pt-BR': {
      title: 'Recomendações',
      description: 'Recomendações e endossos profissionais',
      label: 'recomendações',
      noDataLabel: 'Não tenho recomendações para adicionar',
      placeholder: 'Adicione suas recomendações...',
      addLabel: 'Adicionar Recomendação',
    },
    es: {
      title: 'Recomendaciones',
      description: 'Recomendaciones y avales profesionales',
      label: 'recomendaciones',
      noDataLabel: 'No tengo recomendaciones para agregar',
      placeholder: 'Agrega tus recomendaciones...',
      addLabel: 'Agregar Recomendación',
    },
  },
};

/**
 * Icon mapping for section types
 * Uses Lucide icon names (kebab-case format)
 * @see https://lucide.dev/icons
 */
export const sectionTypeIcons: Record<string, { iconType: 'emoji' | 'lucide'; icon: string }> = {
  work_experience_v1: { iconType: 'lucide', icon: 'briefcase' },
  education_v1: { iconType: 'lucide', icon: 'graduation-cap' },
  skill_set_v1: { iconType: 'lucide', icon: 'zap' },
  language_v1: { iconType: 'lucide', icon: 'globe' },
  certification_v1: { iconType: 'lucide', icon: 'badge-check' },
  project_v1: { iconType: 'lucide', icon: 'rocket' },
  publication_v1: { iconType: 'lucide', icon: 'book-open' },
  award_v1: { iconType: 'lucide', icon: 'trophy' },
  volunteer_v1: { iconType: 'lucide', icon: 'heart-handshake' },
  open_source_v1: { iconType: 'lucide', icon: 'git-branch' },
  bug_bounty_v1: { iconType: 'lucide', icon: 'bug' },
  hackathon_v1: { iconType: 'lucide', icon: 'medal' },
  talk_v1: { iconType: 'lucide', icon: 'mic' },
  achievement_v1: { iconType: 'lucide', icon: 'star' },
  summary_v1: { iconType: 'lucide', icon: 'file-text' },
  interest_v1: { iconType: 'lucide', icon: 'lightbulb' },
  recommendation_v1: { iconType: 'lucide', icon: 'users' },
};
