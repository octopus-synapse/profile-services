import { LOCALES } from '@packages/i18n';
import type { Prisma, PrismaClient } from '@prisma/client';

interface OnboardingStepSeed {
  key: string;
  order: number;
  component: string;
  icon: string;
  required: boolean;
  sectionTypeKey: string | null;
  fields: Prisma.InputJsonValue;
  translations: Prisma.InputJsonValue;
  validation: Prisma.InputJsonValue;
  strengthWeight: number;
}

const steps: OnboardingStepSeed[] = [
  {
    key: 'welcome',
    order: 0,
    component: 'welcome',
    icon: '🚀',
    required: true,
    sectionTypeKey: null,
    fields: [],
    translations: {
      en: { label: 'Welcome', description: "Let's get to know you" },
      'pt-BR': { label: 'Início', description: 'Vamos conhecer você melhor' },
    },
    validation: {},
    strengthWeight: 0,
  },
  {
    key: 'personal-info',
    order: 1,
    component: 'personal-info',
    icon: '👤',
    required: true,
    sectionTypeKey: null,
    fields: [
      {
        key: 'fullName',
        type: 'text',
        required: true,
        examples: ['Maria Silva', 'João Pedro', 'Ana Costa', 'Lucas Ferreira'],
      },
      {
        key: 'phone',
        type: 'text',
        required: true,
        examples: ['+55 11 99999-0000', '+55 21 98888-1111'],
      },
      {
        key: 'location',
        type: 'text',
        required: false,
        examples: ['São Paulo, SP', 'Rio de Janeiro, RJ', 'Belo Horizonte, MG'],
      },
    ],
    translations: {
      en: {
        label: 'About you',
        description: 'Tell us about you',
        fieldLabels: {
          fullName: 'Full Name',
          phone: 'Phone',
          location: 'Location',
        },
      },
      'pt-BR': {
        label: 'Sobre você',
        description: 'Conta um pouco sobre você',
        fieldLabels: {
          fullName: 'Nome Completo',
          phone: 'Telefone',
          location: 'Localização',
        },
      },
    },
    validation: { requiredFields: ['fullName', 'phone'] },
    strengthWeight: 15,
  },
  {
    key: 'username',
    order: 2,
    component: 'username',
    icon: '@',
    required: true,
    sectionTypeKey: null,
    fields: [
      {
        key: 'username',
        type: 'text',
        required: true,
        examples: ['maria_silva', 'joao.dev', 'ana_costa'],
      },
    ],
    translations: {
      en: {
        label: 'Your handle',
        description: 'Pick a unique username',
        fieldLabels: { username: 'Username' },
      },
      'pt-BR': {
        label: 'Seu usuário',
        description: 'Escolha um nome único pro seu perfil',
        fieldLabels: { username: 'Nome de Usuário' },
      },
    },
    validation: {
      requiredFields: ['username'],
      minLength: { username: 3 },
      maxLength: { username: 30 },
    },
    strengthWeight: 10,
  },
  {
    key: 'professional-profile',
    order: 3,
    component: 'professional-profile',
    icon: '💼',
    required: true,
    sectionTypeKey: null,
    fields: [
      {
        key: 'jobTitle',
        type: 'text',
        required: true,
        examples: ['Software Engineer', 'Product Designer', 'Data Analyst', 'Tech Lead'],
      },
      {
        key: 'summary',
        type: 'textarea',
        widget: 'textarea',
        required: false,
        examples: [
          'Experienced software engineer with expertise in building scalable APIs and microservices...',
        ],
      },
      { key: 'linkedin', type: 'url', required: false, examples: ['linkedin.com/in/your-profile'] },
      { key: 'github', type: 'url', required: false, examples: ['github.com/your-username'] },
      { key: 'website', type: 'url', required: false, examples: ['your-portfolio.com'] },
    ],
    translations: {
      en: {
        label: 'Your career',
        description: 'Tell us about your career',
        fieldLabels: {
          jobTitle: 'Job Title',
          summary: 'Headline',
          linkedin: 'LinkedIn',
          github: 'GitHub',
          website: 'Website',
        },
      },
      'pt-BR': {
        label: 'Sua carreira',
        description: 'Conta um pouco da sua carreira',
        fieldLabels: {
          jobTitle: 'Cargo',
          summary: 'Headline',
          linkedin: 'LinkedIn',
          github: 'GitHub',
          website: 'Website',
        },
      },
    },
    validation: { requiredFields: ['jobTitle'] },
    strengthWeight: 10,
  },
  {
    key: 'section:work_experience_v1',
    order: 4,
    component: 'generic-section',
    icon: '💼',
    required: false,
    sectionTypeKey: 'work_experience_v1',
    fields: [],
    translations: {
      en: {
        label: 'Where you worked',
        description: 'Your professional history',
        noDataLabel: "I don't have work experience yet",
        placeholder: 'Add your work experience…',
        addLabel: 'Add Experience',
      },
      'pt-BR': {
        label: 'Onde você trabalhou',
        description: 'Sua trajetória profissional',
        noDataLabel: 'Ainda não tenho experiência profissional',
        placeholder: 'Adicione sua experiência…',
        addLabel: 'Adicionar',
      },
    },
    validation: {},
    strengthWeight: 15,
  },
  {
    key: 'section:education_v1',
    order: 5,
    component: 'generic-section',
    icon: '🎓',
    required: false,
    sectionTypeKey: 'education_v1',
    fields: [],
    translations: {
      en: {
        label: 'Where you studied',
        description: 'Your academic background',
        noDataLabel: "I don't have formal education to add",
        placeholder: 'Add your education…',
        addLabel: 'Add Education',
      },
      'pt-BR': {
        label: 'Onde você estudou',
        description: 'Sua formação acadêmica',
        noDataLabel: 'Não tenho formação acadêmica pra adicionar',
        placeholder: 'Adicione sua formação…',
        addLabel: 'Adicionar',
      },
    },
    validation: {},
    strengthWeight: 10,
  },
  {
    key: 'section:skill_set_v1',
    order: 6,
    component: 'generic-section',
    icon: '⚡',
    required: false,
    sectionTypeKey: 'skill_set_v1',
    fields: [],
    translations: {
      en: {
        label: 'Hard Skills',
        description: 'Technical skills',
        noDataLabel: "I'm still developing my technical skills",
        placeholder: 'Add your technical skills…',
        addLabel: 'Add Skill',
      },
      'pt-BR': {
        label: 'Habilidades técnicas',
        description: 'Suas habilidades técnicas',
        noDataLabel: 'Ainda estou desenvolvendo minhas habilidades técnicas',
        placeholder: 'Adicione suas habilidades técnicas…',
        addLabel: 'Adicionar',
      },
    },
    validation: {},
    strengthWeight: 15,
  },
  {
    key: 'section:soft_skill_set_v1',
    order: 7,
    component: 'generic-section',
    icon: '🤝',
    required: false,
    sectionTypeKey: 'soft_skill_set_v1',
    fields: [],
    translations: {
      en: {
        label: 'Soft Skills',
        description: 'Behavioral skills',
        noDataLabel: "I don't have soft skills to highlight",
        placeholder: 'Add your soft skills…',
        addLabel: 'Add Skill',
      },
      'pt-BR': {
        label: 'Habilidades comportamentais',
        description: 'Suas competências comportamentais',
        noDataLabel: 'Não tenho competências comportamentais pra destacar',
        placeholder: 'Adicione suas competências comportamentais…',
        addLabel: 'Adicionar',
      },
    },
    validation: {},
    strengthWeight: 10,
  },
  {
    key: 'section:language_v1',
    order: 8,
    component: 'generic-section',
    icon: '🌍',
    required: false,
    sectionTypeKey: 'language_v1',
    fields: [],
    translations: {
      en: {
        label: 'Languages',
        description: 'Languages you speak',
        noDataLabel: "I don't have languages to add",
        placeholder: 'Add languages you speak…',
        addLabel: 'Add Language',
      },
      'pt-BR': {
        label: 'Idiomas',
        description: 'Idiomas que você fala',
        noDataLabel: 'Não tenho idiomas pra adicionar',
        placeholder: 'Adicione idiomas que fala…',
        addLabel: 'Adicionar',
      },
    },
    validation: {},
    strengthWeight: 5,
  },
  {
    key: 'extras-gate',
    order: 9,
    component: 'extras-gate',
    icon: '➕',
    required: false,
    sectionTypeKey: null,
    fields: [],
    translations: {
      en: { label: 'Anything else?', description: 'Pick what else you want to add' },
      'pt-BR': {
        label: 'Algo a mais?',
        description: 'Marca o que mais você quer adicionar ao currículo',
      },
    },
    validation: {},
    strengthWeight: 0,
  },
  {
    key: 'section:project_v1',
    order: 10,
    component: 'generic-section',
    icon: '🚀',
    required: false,
    sectionTypeKey: 'project_v1',
    fields: [],
    translations: {
      en: {
        label: 'Projects',
        description: 'Projects you built',
        noDataLabel: "I don't have projects to showcase",
        placeholder: 'Add a project…',
        addLabel: 'Add Project',
      },
      'pt-BR': {
        label: 'Projetos',
        description: 'Projetos que você construiu',
        noDataLabel: 'Não tenho projetos pra mostrar',
        placeholder: 'Adicione um projeto…',
        addLabel: 'Adicionar',
      },
    },
    validation: {},
    strengthWeight: 5,
  },
  {
    key: 'section:certification_v1',
    order: 11,
    component: 'generic-section',
    icon: '📜',
    required: false,
    sectionTypeKey: 'certification_v1',
    fields: [],
    translations: {
      en: {
        label: 'Certifications',
        description: 'Certifications you earned',
        noDataLabel: "I don't have certifications",
        placeholder: 'Add a certification…',
        addLabel: 'Add Certification',
      },
      'pt-BR': {
        label: 'Certificações',
        description: 'Certificações que você conquistou',
        noDataLabel: 'Não tenho certificações',
        placeholder: 'Adicione uma certificação…',
        addLabel: 'Adicionar',
      },
    },
    validation: {},
    strengthWeight: 5,
  },
  {
    key: 'section:award_v1',
    order: 12,
    component: 'generic-section',
    icon: '🏆',
    required: false,
    sectionTypeKey: 'award_v1',
    fields: [],
    translations: {
      en: {
        label: 'Awards',
        description: 'Awards and recognitions',
        noDataLabel: "I don't have awards to mention",
        placeholder: 'Add an award…',
        addLabel: 'Add Award',
      },
      'pt-BR': {
        label: 'Premiações',
        description: 'Prêmios e reconhecimentos',
        noDataLabel: 'Não tenho premiações pra mencionar',
        placeholder: 'Adicione uma premiação…',
        addLabel: 'Adicionar',
      },
    },
    validation: {},
    strengthWeight: 5,
  },
  {
    key: 'section:publication_v1',
    order: 13,
    component: 'generic-section',
    icon: '📝',
    required: false,
    sectionTypeKey: 'publication_v1',
    fields: [],
    translations: {
      en: {
        label: 'Publications',
        description: 'Articles, papers, talks',
        noDataLabel: "I don't have publications",
        placeholder: 'Add a publication…',
        addLabel: 'Add Publication',
      },
      'pt-BR': {
        label: 'Publicações',
        description: 'Artigos, papers, palestras',
        noDataLabel: 'Não tenho publicações',
        placeholder: 'Adicione uma publicação…',
        addLabel: 'Adicionar',
      },
    },
    validation: {},
    strengthWeight: 5,
  },
  {
    key: 'template',
    order: 14,
    component: 'template',
    icon: '🎨',
    required: true,
    sectionTypeKey: null,
    fields: [
      { key: 'templateId', type: 'text', required: false },
      { key: 'colorScheme', type: 'text', required: true },
    ],
    translations: {
      en: {
        label: 'Theme',
        description: 'Choose Your Theme',
        fieldLabels: { templateId: 'Template', colorScheme: 'Color Scheme' },
      },
      'pt-BR': {
        label: 'Tema',
        description: 'Escolha seu Tema',
        fieldLabels: { templateId: 'Modelo', colorScheme: 'Esquema de Cores' },
      },
    },
    validation: { requiredFields: ['colorScheme'] },
    strengthWeight: 10,
  },
  {
    key: 'review',
    order: 15,
    component: 'review',
    icon: '✓',
    required: true,
    sectionTypeKey: null,
    fields: [],
    translations: {
      en: { label: 'Review', description: 'Review & Submit' },
      'pt-BR': { label: 'Revisão', description: 'Revisar e Enviar' },
    },
    validation: {},
    strengthWeight: 0,
  },
  {
    key: 'complete',
    order: 16,
    component: 'complete',
    icon: '🎉',
    required: true,
    sectionTypeKey: null,
    fields: [],
    translations: {
      en: { label: 'Done', description: 'Setup Complete' },
      'pt-BR': { label: 'Pronto', description: 'Configuração Completa' },
    },
    validation: {},
    strengthWeight: 0,
  },
];

const strengthLevels = [
  { minScore: 0, level: 'weak', message: "Let's get started!" },
  { minScore: 25, level: 'growing', message: 'Taking shape...' },
  { minScore: 50, level: 'strong', message: 'Almost there!' },
  { minScore: 75, level: 'excellent', message: 'Looking great!' },
  { minScore: 100, level: 'complete', message: 'Ready to impress!' },
];

const sectionExamples: Record<string, Record<string, string[]>> = {
  work_experience_v1: {
    company: ['Google', 'Nubank', 'iFood', 'Mercado Livre'],
    role: ['Senior Developer', 'Tech Lead', 'Full Stack Engineer'],
  },
  education_v1: {
    institution: ['USP', 'UNICAMP', 'PUC-Rio', 'UFMG'],
    degree: ['Computer Science', 'Software Engineering', 'Information Systems'],
  },
  skill_set_v1: {
    name: ['TypeScript', 'React', 'Node.js', 'Python', 'PostgreSQL'],
  },
  soft_skill_set_v1: {
    name: ['Leadership', 'Communication', 'Teamwork', 'Problem solving'],
  },
  language_v1: {
    name: ['English', 'Spanish', 'Portuguese', 'French'],
  },
  project_v1: {
    title: ['Personal portfolio', 'Side project', 'Open source contribution'],
  },
  certification_v1: {
    title: ['AWS Certified Developer', 'Google Cloud Associate', 'Scrum Master'],
    issuer: ['AWS', 'Google Cloud', 'Scrum Alliance'],
  },
  award_v1: {
    title: ['Hackathon winner', 'Employee of the year', 'Best paper award'],
  },
  publication_v1: {
    title: ['Article on Medium', 'Conference talk', 'Research paper'],
  },
};

for (const step of steps) {
  const t = step.translations as Record<string, unknown>;
  for (const locale of LOCALES) {
    if (!(locale in t)) {
      console.error(`[onboarding-step.seed] step '${step.key}' missing locale '${locale}'`);
      process.exit(1);
    }
  }
  for (const locale of Object.keys(t)) {
    if (!(LOCALES as readonly string[]).includes(locale)) {
      console.error(`[onboarding-step.seed] step '${step.key}' has rogue locale '${locale}'`);
      process.exit(1);
    }
  }
}

export async function seedOnboardingSteps(prisma: PrismaClient) {
  console.log('🚀 Seeding onboarding steps...');

  for (const step of steps) {
    await prisma.onboardingStep.upsert({
      where: { key: step.key },
      update: {
        order: step.order,
        component: step.component,
        icon: step.icon,
        required: step.required,
        sectionTypeKey: step.sectionTypeKey,
        fields: step.fields,
        translations: step.translations,
        validation: step.validation,
        strengthWeight: step.strengthWeight,
      },
      create: {
        key: step.key,
        order: step.order,
        component: step.component,
        icon: step.icon,
        required: step.required,
        sectionTypeKey: step.sectionTypeKey,
        fields: step.fields,
        translations: step.translations,
        validation: step.validation,
        strengthWeight: step.strengthWeight,
      },
    });
  }

  console.log(`  ✅ ${steps.length} onboarding steps seeded`);

  await prisma.onboardingConfig.upsert({
    where: { key: 'default' },
    update: { strengthLevels },
    create: { key: 'default', strengthLevels },
  });

  console.log('  ✅ Onboarding config seeded');

  for (const [key, examples] of Object.entries(sectionExamples)) {
    await prisma.sectionType.updateMany({
      where: { key },
      data: { examples },
    });
  }

  console.log(`  ✅ ${Object.keys(sectionExamples).length} section type examples seeded`);
}
