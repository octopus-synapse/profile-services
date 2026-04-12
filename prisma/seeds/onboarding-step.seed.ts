import type { PrismaClient } from '@prisma/client';

interface OnboardingStepSeed {
  key: string;
  order: number;
  component: string;
  icon: string;
  required: boolean;
  sectionTypeKey: string | null;
  fields: unknown[];
  translations: Record<string, unknown>;
  validation: Record<string, unknown>;
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
      en: { label: 'Welcome', description: 'Welcome to ProFile' },
      'pt-BR': { label: 'Início', description: 'Bem-vindo ao ProFile' },
      es: { label: 'Inicio', description: 'Bienvenido a ProFile' },
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
        key: 'email',
        type: 'email',
        required: true,
        examples: ['maria@email.com', 'joao.pedro@gmail.com'],
      },
      {
        key: 'phone',
        type: 'text',
        required: false,
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
        label: 'Personal Info',
        description: 'Personal Information',
        fieldLabels: {
          fullName: 'Full Name',
          email: 'Email',
          phone: 'Phone',
          location: 'Location',
        },
      },
      'pt-BR': {
        label: 'Dados Pessoais',
        description: 'Informações Pessoais',
        fieldLabels: {
          fullName: 'Nome Completo',
          email: 'E-mail',
          phone: 'Telefone',
          location: 'Localização',
        },
      },
      es: {
        label: 'Datos Personales',
        description: 'Información Personal',
        fieldLabels: {
          fullName: 'Nombre Completo',
          email: 'Correo',
          phone: 'Teléfono',
          location: 'Ubicación',
        },
      },
    },
    validation: { requiredFields: ['fullName', 'email'] },
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
        label: 'Username',
        description: 'Choose Your Username',
        fieldLabels: { username: 'Username' },
      },
      'pt-BR': {
        label: 'Usuário',
        description: 'Escolha seu Usuário',
        fieldLabels: { username: 'Nome de Usuário' },
      },
      es: {
        label: 'Usuario',
        description: 'Elige tu Usuario',
        fieldLabels: { username: 'Nombre de Usuario' },
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
        label: 'Profile',
        description: 'Professional Profile',
        fieldLabels: {
          jobTitle: 'Job Title',
          summary: 'Summary',
          linkedin: 'LinkedIn',
          github: 'GitHub',
          website: 'Website',
        },
      },
      'pt-BR': {
        label: 'Perfil',
        description: 'Perfil Profissional',
        fieldLabels: {
          jobTitle: 'Cargo',
          summary: 'Resumo',
          linkedin: 'LinkedIn',
          github: 'GitHub',
          website: 'Website',
        },
      },
      es: {
        label: 'Perfil',
        description: 'Perfil Profesional',
        fieldLabels: {
          jobTitle: 'Puesto',
          summary: 'Resumen',
          linkedin: 'LinkedIn',
          github: 'GitHub',
          website: 'Sitio Web',
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
        label: 'Work Experience',
        description: 'Work Experience',
        noDataLabel: "I don't have work experience to add",
        placeholder: 'Add your work experience...',
        addLabel: 'Add Experience',
      },
      'pt-BR': {
        label: 'Experiência',
        description: 'Experiência Profissional',
        noDataLabel: 'Não tenho experiência profissional',
        placeholder: 'Adicione sua experiência...',
        addLabel: 'Adicionar',
      },
      es: {
        label: 'Experiencia',
        description: 'Experiencia Laboral',
        noDataLabel: 'No tengo experiencia laboral',
        placeholder: 'Agrega tu experiencia...',
        addLabel: 'Agregar',
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
        label: 'Education',
        description: 'Education',
        noDataLabel: "I don't have education to add",
        placeholder: 'Add your education...',
        addLabel: 'Add Education',
      },
      'pt-BR': {
        label: 'Educação',
        description: 'Formação Acadêmica',
        noDataLabel: 'Não tenho formação acadêmica',
        placeholder: 'Adicione sua formação...',
        addLabel: 'Adicionar',
      },
      es: {
        label: 'Educación',
        description: 'Formación Académica',
        noDataLabel: 'No tengo formación académica',
        placeholder: 'Agrega tu formación...',
        addLabel: 'Agregar',
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
        label: 'Skills',
        description: 'Skills',
        noDataLabel: "I'm still developing my skills",
        placeholder: 'Add your skills...',
        addLabel: 'Add Skill',
      },
      'pt-BR': {
        label: 'Habilidades',
        description: 'Habilidades',
        noDataLabel: 'Ainda estou desenvolvendo minhas habilidades',
        placeholder: 'Adicione suas habilidades...',
        addLabel: 'Adicionar',
      },
      es: {
        label: 'Habilidades',
        description: 'Habilidades',
        noDataLabel: 'Todavía estoy desarrollando mis habilidades',
        placeholder: 'Agrega tus habilidades...',
        addLabel: 'Agregar',
      },
    },
    validation: {},
    strengthWeight: 15,
  },
  {
    key: 'section:language_v1',
    order: 7,
    component: 'generic-section',
    icon: '🌍',
    required: false,
    sectionTypeKey: 'language_v1',
    fields: [],
    translations: {
      en: {
        label: 'Languages',
        description: 'Languages',
        noDataLabel: "I don't have languages to add",
        placeholder: 'Add languages you speak...',
        addLabel: 'Add Language',
      },
      'pt-BR': {
        label: 'Idiomas',
        description: 'Idiomas',
        noDataLabel: 'Não tenho idiomas para adicionar',
        placeholder: 'Adicione idiomas que fala...',
        addLabel: 'Adicionar',
      },
      es: {
        label: 'Idiomas',
        description: 'Idiomas',
        noDataLabel: 'No tengo idiomas para agregar',
        placeholder: 'Agrega idiomas que hablas...',
        addLabel: 'Agregar',
      },
    },
    validation: {},
    strengthWeight: 5,
  },
  {
    key: 'template',
    order: 8,
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
      es: {
        label: 'Tema',
        description: 'Elige tu Tema',
        fieldLabels: { templateId: 'Plantilla', colorScheme: 'Esquema de Colores' },
      },
    },
    validation: { requiredFields: ['colorScheme'] },
    strengthWeight: 10,
  },
  {
    key: 'review',
    order: 9,
    component: 'review',
    icon: '✓',
    required: true,
    sectionTypeKey: null,
    fields: [],
    translations: {
      en: { label: 'Review', description: 'Review & Submit' },
      'pt-BR': { label: 'Revisão', description: 'Revisar e Enviar' },
      es: { label: 'Revisión', description: 'Revisar y Enviar' },
    },
    validation: {},
    strengthWeight: 0,
  },
  {
    key: 'complete',
    order: 10,
    component: 'complete',
    icon: '🎉',
    required: true,
    sectionTypeKey: null,
    fields: [],
    translations: {
      en: { label: 'Done', description: 'Setup Complete' },
      'pt-BR': { label: 'Pronto', description: 'Configuração Completa' },
      es: { label: 'Listo', description: 'Configuración Completa' },
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
  language_v1: {
    name: ['English', 'Spanish', 'Portuguese', 'French'],
  },
};

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
