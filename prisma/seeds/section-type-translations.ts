import { LOCALES } from '@packages/i18n';

export interface SectionTypeTranslation {
  title: string;
  description: string;
  label: string;
  noDataLabel: string;
  placeholder: string;
  addLabel: string;
  fieldLabels?: Record<string, string>;
}

export type SectionTypeTranslations = {
  [locale: string]: SectionTypeTranslation;
};

export const sectionTypeTranslations: Record<string, SectionTypeTranslations> = {
  work_experience_v1: {
    en: {
      title: 'Work Experience',
      description: 'Professional work history and employment',
      label: 'Work Experience',
      noDataLabel: "I don't have work experience to add right now",
      placeholder: 'Add your professional experience...',
      addLabel: 'Add Experience',
    },
    'pt-BR': {
      title: 'Experiência Profissional',
      description: 'Histórico de trabalho e empregos',
      label: 'Trabalho',
      noDataLabel: 'Não tenho experiência profissional para adicionar agora',
      placeholder: 'Adicione sua experiência profissional...',
      addLabel: 'Adicionar Experiência',
      fieldLabels: {
        company: 'Empresa',
        role: 'Cargo',
        employmentType: 'Tipo de Contrato',
        startDate: 'Data de Início',
        endDate: 'Data de Término',
        description: 'Descrição',
        achievements: 'Conquistas',
      },
    },
  },

  education_v1: {
    en: {
      title: 'Education',
      description: 'Academic history and qualifications',
      label: 'Education',
      noDataLabel: "I don't have education to add right now",
      placeholder: 'Add your education...',
      addLabel: 'Add Education',
    },
    'pt-BR': {
      title: 'Formação Acadêmica',
      description: 'Histórico acadêmico e qualificações',
      label: 'Formação',
      noDataLabel: 'Não tenho formação acadêmica para adicionar agora',
      placeholder: 'Adicione sua formação acadêmica...',
      addLabel: 'Adicionar Formação',
      fieldLabels: {
        institution: 'Instituição',
        degree: 'Grau',
        field: 'Área de Estudo',
        startDate: 'Data de Início',
        endDate: 'Data de Término',
      },
    },
  },

  skill_set_v1: {
    en: {
      title: 'Hard Skills',
      description: 'Technical and hard skills',
      label: 'Hard Skills',
      noDataLabel: "I'm still developing my technical skills",
      placeholder: 'Add your technical skills...',
      addLabel: 'Add Skill',
      fieldLabels: {
        name: 'Skill Name',
        category: 'Category',
      },
    },
    'pt-BR': {
      title: 'Habilidades Técnicas',
      description: 'Habilidades técnicas e hard skills',
      label: 'Habilidades Técnicas',
      noDataLabel: 'Ainda estou desenvolvendo minhas habilidades técnicas',
      placeholder: 'Adicione suas habilidades técnicas...',
      addLabel: 'Adicionar Habilidade',
      fieldLabels: {
        name: 'Nome da Habilidade',
        category: 'Categoria',
      },
    },
  },

  soft_skill_set_v1: {
    en: {
      title: 'Soft Skills',
      description: 'Behavioural and interpersonal skills',
      label: 'Soft Skills',
      noDataLabel: "I don't have soft skills to highlight",
      placeholder: 'Add your soft skills...',
      addLabel: 'Add Skill',
      fieldLabels: {
        name: 'Skill Name',
      },
    },
    'pt-BR': {
      title: 'Habilidades Comportamentais',
      description: 'Habilidades comportamentais e interpessoais',
      label: 'Habilidades Comportamentais',
      noDataLabel: 'Não tenho habilidades comportamentais para destacar',
      placeholder: 'Adicione suas habilidades comportamentais...',
      addLabel: 'Adicionar Habilidade',
      fieldLabels: {
        name: 'Nome da Habilidade',
      },
    },
  },

  language_v1: {
    en: {
      title: 'Languages',
      description: 'Spoken languages and proficiency levels',
      label: 'Languages',
      noDataLabel: "I don't have additional languages to add",
      placeholder: 'Add languages you speak...',
      addLabel: 'Add Language',
    },
    'pt-BR': {
      title: 'Idiomas',
      description: 'Idiomas falados e níveis de proficiência',
      label: 'Idiomas',
      noDataLabel: 'Não tenho idiomas adicionais para adicionar',
      placeholder: 'Adicione os idiomas que você fala...',
      addLabel: 'Adicionar Idioma',
      fieldLabels: {
        name: 'Idioma',
        level: 'Nível',
      },
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
  },
};

/**
 * Icon mapping for section types
 * Uses Lucide icon names (kebab-case format)
 * @see https://lucide.dev/icons
 */
for (const [key, entry] of Object.entries(sectionTypeTranslations)) {
  for (const locale of LOCALES) {
    if (!(locale in entry)) {
      console.error(`[section-type-translations] '${key}' missing locale '${locale}'`);
      process.exit(1);
    }
  }
  for (const locale of Object.keys(entry)) {
    if (!(LOCALES as readonly string[]).includes(locale)) {
      console.error(`[section-type-translations] '${key}' has rogue locale '${locale}'`);
      process.exit(1);
    }
  }
}

export const sectionTypeIcons: Record<string, { iconType: 'emoji' | 'lucide'; icon: string }> = {
  work_experience_v1: { iconType: 'lucide', icon: 'briefcase' },
  education_v1: { iconType: 'lucide', icon: 'graduation-cap' },
  skill_set_v1: { iconType: 'lucide', icon: 'zap' },
  soft_skill_set_v1: { iconType: 'lucide', icon: 'handshake' },
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
