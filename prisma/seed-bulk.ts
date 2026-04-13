/**
 * Bulk seed script: 100 users (30 power, 50 regulars, 20 casuals)
 *
 * All seed entities tagged with `seed_` prefix for easy cleanup.
 * Run: bun run prisma/seed-bulk.ts
 * Cleanup: bun run prisma/seed-bulk-cleanup.ts
 */

import { faker } from '@faker-js/faker';
import { PrismaPg } from '@prisma/adapter-pg';
import { type Post, Prisma, PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

// ==========================================
// Config
// ==========================================

const POWER_USERS = 30;
const REGULAR_USERS = 50;
const CASUAL_USERS = 20;
const TOTAL_USERS = POWER_USERS + REGULAR_USERS + CASUAL_USERS;

const SEED_PREFIX = 'seed_';
const SEED_EMAIL_DOMAIN = 'patchcareers-seed.local';

// Pre-hashed password "SeedUser123!" — computed at runtime inside main()
let SHARED_PASSWORD_HASH = '';

// ==========================================
// Archetypes
// ==========================================

type Archetype = {
  id: string;
  title: (level: string) => string;
  level: 'Junior' | 'Mid' | 'Senior';
  skills: string[];
  languages: string[];
  softSkills: string[];
  companies: string[];
  bioTemplates: string[];
  postTemplates: Record<string, string[]>;
  hashtags: string[];
};

const ARCHETYPES: Archetype[] = [
  {
    id: 'frontend_jr',
    title: (l) => `${l} Frontend Developer`,
    level: 'Junior',
    skills: [
      'React',
      'TypeScript',
      'JavaScript',
      'HTML',
      'CSS',
      'Tailwind CSS',
      'Git',
      'Figma',
      'Next.js',
      'Vite',
    ],
    languages: ['JavaScript', 'TypeScript', 'HTML', 'CSS'],
    softSkills: ['Curiosity', 'Teamwork', 'Problem Solving', 'Communication'],
    companies: [
      'Stone',
      'PagSeguro',
      'Nubank',
      'iFood',
      'Loft',
      'Quinto Andar',
      'Magazine Luiza',
      'Americanas',
    ],
    bioTemplates: [
      'Frontend dev apaixonado por UIs limpas e acessiveis. Estudando {skill} diariamente.',
      'Desenvolvedor frontend em transicao de carreira. Amo {skill} e componentes reutilizaveis.',
      'Construindo interfaces com {skill}. Sempre aprendendo.',
    ],
    postTemplates: {
      ACHIEVEMENT: [
        'Terminei o curso avancado de {skill}! Proximo passo: contribuir pra open source.',
        'Primeira PR aprovada em producao hoje! {skill} ta ficando mais claro.',
        'Aprendi {skill} em 30 dias com side projects diarios.',
      ],
      LEARNING: [
        'Hoje aprendi sobre {skill}. Mudou minha forma de pensar em componentes.',
        'Lendo sobre {skill} esta semana. Recomendo muito.',
        '{skill} vs alternativa: fiz um benchmark e os resultados surpreenderam.',
      ],
      BUILD: [
        'Lancei meu primeiro projeto com {skill}. Feedback bem vindo!',
        'Refatorando meu portfolio com {skill}. Performance subiu 40%.',
        'Clone do Twitter usando {skill}. Bom exercicio de state management.',
      ],
      QUESTION: [
        'Qual melhor approach pra gerenciar state em apps {skill}?',
        'Alguem tem recomendacao de curso avancado de {skill}?',
        '{skill} ou framework X? O que voces usam?',
      ],
      OPPORTUNITY: [
        'Time procurando frontend jr com {skill}. Remote, PJ ou CLT.',
        'Mentor procurando mentorado em {skill}. Grupo pequeno.',
      ],
    },
    hashtags: ['frontend', 'react', 'typescript', 'webdev', 'javascript', 'tailwind'],
  },
  {
    id: 'backend_sr',
    title: (l) => `${l} Backend Engineer`,
    level: 'Senior',
    skills: [
      'Node.js',
      'TypeScript',
      'Go',
      'Python',
      'PostgreSQL',
      'Redis',
      'Docker',
      'Kubernetes',
      'AWS',
      'GraphQL',
      'gRPC',
    ],
    languages: ['Node.js', 'Go', 'Python', 'TypeScript', 'SQL'],
    softSkills: ['Leadership', 'Mentorship', 'System Design', 'Code Review'],
    companies: ['Uber', 'Stripe', 'Mercado Pago', 'EBANX', 'Dock', 'CI&T', 'ThoughtWorks', 'AWS'],
    bioTemplates: [
      'Senior backend engineer. {years} anos construindo sistemas distribuidos em {skill}.',
      'Designer de sistemas de alta escala. Ama {skill} e event-driven architectures.',
      'Staff engineer apaixonado por performance e DX. Trabalho remoto.',
    ],
    postTemplates: {
      ACHIEVEMENT: [
        'Migramos {skill} pra microservicos: latencia P95 caiu de 800ms pra 120ms.',
        'Publiquei paper sobre {skill} no devto. 2k visualizacoes em uma semana.',
        'Aprovei 47 PRs esse mes. Mentorship > solo coding.',
      ],
      LEARNING: [
        'Deep dive em {skill} e event sourcing. Thread abaixo.',
        'Refactor de {skill} pra hexagonal architecture. Licao: testes primeiro.',
        'Estudando Raft consensus. {skill} fica muito mais claro depois.',
      ],
      BUILD: [
        'Open sourced meu starter kit de {skill}. Inclui observability pronto.',
        'Lib nova pra gerenciar transacoes em {skill}. Feedback?',
        'Built a rate limiter em {skill} com token bucket. Benchmarks incluidos.',
      ],
      QUESTION: [
        'Kafka vs RabbitMQ em {skill}: qual voces usam pra event streaming?',
        'Como voces lidam com eventual consistency em {skill}?',
        'CQRS vale a pena em monolitos medios?',
      ],
      OPPORTUNITY: [
        'Minha squad ta contratando senior {skill}. Remote LATAM. DM se interessou.',
        'Recomendo fortemente essa vaga de staff engineer. Benefits otimos.',
      ],
    },
    hashtags: ['backend', 'nodejs', 'distributedsystems', 'microservices', 'devops'],
  },
  {
    id: 'fullstack_mid',
    title: (l) => `${l} Full Stack Developer`,
    level: 'Mid',
    skills: [
      'React',
      'Node.js',
      'TypeScript',
      'Next.js',
      'PostgreSQL',
      'AWS',
      'Prisma',
      'GraphQL',
      'Docker',
    ],
    languages: ['TypeScript', 'JavaScript', 'SQL'],
    softSkills: ['Adaptability', 'Communication', 'Ownership', 'Time Management'],
    companies: [
      'RD Station',
      'Resultados Digitais',
      'Movile',
      'Locaweb',
      'Gympass',
      'OLX',
      'Globo',
    ],
    bioTemplates: [
      'Full-stack dev, de SQL a CSS. Stack favorita: {skill}.',
      'Entregando features end-to-end com {skill}. Produto + engenharia.',
      'Mid-level full-stack. Gosto de ownership de feature.',
    ],
    postTemplates: {
      ACHIEVEMENT: [
        'Shipamos nova feature com {skill} em 2 semanas. Do design ao deploy.',
        'Cheguei em mid-level! 3 anos de muito aprendizado e bugs.',
      ],
      LEARNING: [
        'Aprendendo patterns de DDD em {skill}. Ainda e confuso mas ja faz sentido.',
        '{skill} + Server Components: o futuro do fullstack.',
      ],
      BUILD: [
        'Fiz um SaaS com {skill} em 3 fins de semana. Codigo publico.',
        'Meu side project virou MVP: {skill} + Postgres + Stripe.',
      ],
      QUESTION: [
        'Monorepo ou polyrepo com {skill}? Pros e contras?',
        'tRPC vs REST vs GraphQL: qual voces preferem?',
      ],
    },
    hashtags: ['fullstack', 'nextjs', 'typescript', 'sideproject'],
  },
  {
    id: 'designer',
    title: (l) => `${l} UI/UX Designer`,
    level: 'Mid',
    skills: [
      'Figma',
      'Design Systems',
      'Prototyping',
      'User Research',
      'Sketch',
      'Adobe XD',
      'Framer',
      'Principle',
    ],
    languages: ['HTML', 'CSS'],
    softSkills: ['Empathy', 'Visual Thinking', 'Collaboration', 'Storytelling'],
    companies: ['Globo', 'Nubank', 'Stone', 'iFood', 'Movile', 'Creditas', 'Mercado Libre'],
    bioTemplates: [
      'UI/UX designer. Crio experiencias acessiveis e inclusivas. Foco em {skill}.',
      'Designer de produto com {years} anos. De pesquisa a pixel-perfect.',
      'Design systems evangelist. Menos e mais.',
    ],
    postTemplates: {
      ACHIEVEMENT: [
        'Lancei o design system da empresa. +50 componentes em {skill}.',
        'Nossa pesquisa com usuarios validou a hipotese. Feature shipped.',
      ],
      LEARNING: [
        'Dicas de acessibilidade em {skill} que mudaram meu fluxo.',
        'Variables no Figma sao game-changer. Thread abaixo.',
      ],
      BUILD: [
        'Redesenhei meu portfolio com {skill}. Feedback bem vindo.',
        'Kit de UI gratis no Figma. Use a vontade!',
      ],
      QUESTION: [
        'Como voces documentam design decisions?',
        'Dark mode: auto-detect ou toggle explicito?',
      ],
    },
    hashtags: ['design', 'uiux', 'figma', 'designsystems'],
  },
  {
    id: 'data_scientist',
    title: (l) => `${l} Data Scientist`,
    level: 'Mid',
    skills: [
      'Python',
      'SQL',
      'Pandas',
      'NumPy',
      'TensorFlow',
      'PyTorch',
      'Scikit-learn',
      'Jupyter',
      'Airflow',
      'dbt',
      'Spark',
    ],
    languages: ['Python', 'SQL', 'R'],
    softSkills: [
      'Analytical Thinking',
      'Statistical Reasoning',
      'Data Storytelling',
      'Hypothesis Testing',
    ],
    companies: ['Nubank', 'QuintoAndar', 'Olist', 'iFood', 'Rappi', 'Kaggle', 'Databricks'],
    bioTemplates: [
      'Data scientist. De SQL a modelos em producao com {skill}.',
      'Trabalho com dados de comportamento. {skill} + Bayesian stats.',
    ],
    postTemplates: {
      ACHIEVEMENT: [
        'Modelo de churn em producao! Reducao de 15% no primeiro mes.',
        'Publiquei notebook no Kaggle: top 10% na competicao de {skill}.',
      ],
      LEARNING: [
        'Feature engineering e 80% do trabalho. Menos modelo, mais dados.',
        'Causal inference em {skill}: um game-changer pra A/B tests.',
      ],
      BUILD: ['Ferramenta open source pra explorar datasets. {skill} + Streamlit.'],
      QUESTION: [
        'Como voces lidam com data leakage em pipelines?',
        'Metrica favorita pra classificacao desbalanceada?',
      ],
    },
    hashtags: ['datascience', 'machinelearning', 'python', 'analytics'],
  },
  {
    id: 'devops',
    title: (l) => `${l} DevOps Engineer`,
    level: 'Senior',
    skills: [
      'Kubernetes',
      'Terraform',
      'AWS',
      'GCP',
      'Docker',
      'Ansible',
      'Prometheus',
      'Grafana',
      'Linux',
      'Bash',
    ],
    languages: ['Bash', 'Python', 'Go', 'YAML'],
    softSkills: ['Reliability', 'Automation Mindset', 'Incident Response', 'Troubleshooting'],
    companies: ['Movile', 'Stone', 'CI&T', 'Dasa', 'VTEX', 'Cloudwalk'],
    bioTemplates: [
      'SRE/DevOps. Zero downtime deploys, observability {skill} stack.',
      'Infrastructure as code evangelist. {skill} + Terraform + GitOps.',
    ],
    postTemplates: {
      ACHIEVEMENT: [
        'Migracao de {skill} sem downtime. 200k req/s estaveis.',
        'Reduzi custo de AWS em 40% com rightsizing. Thread.',
      ],
      LEARNING: ['eBPF em {skill} e subestimado. Vale o deep dive.'],
      BUILD: ['Terraform modules open source pra {skill}. Uso em 3 empresas.'],
      QUESTION: ['ArgoCD ou Flux pra GitOps?'],
    },
    hashtags: ['devops', 'sre', 'kubernetes', 'aws', 'terraform'],
  },
  {
    id: 'mobile',
    title: (l) => `${l} Mobile Developer`,
    level: 'Mid',
    skills: ['React Native', 'Flutter', 'Swift', 'Kotlin', 'iOS', 'Android', 'Firebase', 'Expo'],
    languages: ['TypeScript', 'Swift', 'Kotlin', 'Dart'],
    softSkills: ['Attention to Detail', 'UX Focus', 'Platform Awareness'],
    companies: ['iFood', 'Rappi', 'Mercado Pago', '99', 'Nubank', 'Creditas'],
    bioTemplates: ['Mobile dev focado em {skill}. Apps escalaveis e responsivos.'],
    postTemplates: {
      ACHIEVEMENT: ['App com 1M downloads! {skill} + cuidado com performance.'],
      LEARNING: ['React Native vs Flutter em 2026: mudancas importantes.'],
      BUILD: ['Publiquei meu primeiro app na App Store. {skill} + Firebase.'],
      QUESTION: ['Native ou cross-platform pra MVP rapido?'],
    },
    hashtags: ['mobile', 'reactnative', 'flutter', 'ios', 'android'],
  },
  {
    id: 'qa',
    title: (l) => `${l} QA Engineer`,
    level: 'Mid',
    skills: [
      'Cypress',
      'Playwright',
      'Jest',
      'Selenium',
      'Postman',
      'TestRail',
      'Cucumber',
      'Appium',
    ],
    languages: ['TypeScript', 'JavaScript', 'Python'],
    softSkills: ['Attention to Detail', 'Critical Thinking', 'Documentation'],
    companies: ['Stone', 'Movile', 'CI&T', 'ThoughtWorks', 'Dasa'],
    bioTemplates: ['QA engineer, automacao com {skill}. Testes como cultura, nao afterthought.'],
    postTemplates: {
      ACHIEVEMENT: ['Cobertura de testes E2E subiu pra 85% com {skill}.'],
      LEARNING: ['Contract testing com {skill}: melhor investimento em 2026.'],
      QUESTION: ['Pyramid ou trophy: qual estrategia de testes voces usam?'],
    },
    hashtags: ['qa', 'testing', 'automation', 'cypress'],
  },
  {
    id: 'pm',
    title: (l) => `${l} Product Manager`,
    level: 'Mid',
    skills: [
      'Product Strategy',
      'Roadmapping',
      'Analytics',
      'SQL',
      'Amplitude',
      'Mixpanel',
      'Jira',
      'User Research',
    ],
    languages: ['SQL'],
    softSkills: [
      'Prioritization',
      'Stakeholder Management',
      'Strategic Thinking',
      'Data-Driven Decisions',
    ],
    companies: ['Nubank', 'QuintoAndar', 'iFood', 'Stone', 'Loft', 'Creditas'],
    bioTemplates: ['Product Manager. Foco em metrics-driven decisions e discovery.'],
    postTemplates: {
      ACHIEVEMENT: ['Nossa feature aumentou retention em 12%. Discovery pagou dividendos.'],
      LEARNING: ['Continuous discovery do Teresa Torres e o padrao ouro. Recomendo.'],
      QUESTION: ['RICE ou ICE pra prioritization?'],
      OPPORTUNITY: ['Meu time contrata PM mid. Remote. Benefits otimos.'],
    },
    hashtags: ['productmanagement', 'productstrategy', 'analytics'],
  },
  {
    id: 'bootcamp',
    title: (_l) => 'Student / Career Transitioner',
    level: 'Junior',
    skills: ['JavaScript', 'HTML', 'CSS', 'React', 'Git', 'Node.js'],
    languages: ['JavaScript', 'HTML', 'CSS'],
    softSkills: ['Learning Mindset', 'Resilience', 'Curiosity'],
    companies: ['Rocketseat', 'Alura', 'Codecademy', 'DIO', 'Kenzie Academy'],
    bioTemplates: [
      'Em transicao de carreira pra tech. Cursando bootcamp em {skill}.',
      'Estudante de programacao. {skill} e minha paixao atual.',
    ],
    postTemplates: {
      ACHIEVEMENT: [
        'Finalizei o modulo de {skill}! Proximo: mergulhar em APIs.',
        'Consegui minha primeira vaga junior! Muito grato pela comunidade.',
      ],
      LEARNING: ['Hoje entendi callbacks em {skill}. Revelacao total.'],
      BUILD: ['Meu primeiro projeto em {skill}. Feedback pra melhorar?'],
      QUESTION: [
        'Como comecar com {skill}? Curso pago ou gratuito?',
        'Alguem pra fazer pair programming em {skill}?',
      ],
    },
    hashtags: ['bootcamp', 'learningtocode', 'beginner', 'coding'],
  },
];

// Distribution: how many users per archetype per tier
const DISTRIBUTION: Record<string, { power: number; regular: number; casual: number }> = {
  frontend_jr: { power: 3, regular: 5, casual: 2 },
  backend_sr: { power: 3, regular: 5, casual: 2 },
  fullstack_mid: { power: 4, regular: 6, casual: 3 },
  designer: { power: 3, regular: 5, casual: 2 },
  data_scientist: { power: 3, regular: 5, casual: 2 },
  devops: { power: 3, regular: 5, casual: 2 },
  mobile: { power: 3, regular: 5, casual: 2 },
  qa: { power: 2, regular: 4, casual: 2 },
  pm: { power: 3, regular: 5, casual: 2 },
  bootcamp: { power: 3, regular: 5, casual: 1 },
};

type Tier = 'power' | 'regular' | 'casual';

// ==========================================
// Helpers
// ==========================================

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMany<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedDate(daysAgoMax: number, biasRecent = 0.6): Date {
  // Bias toward recent dates (exponential-ish)
  const r = Math.random();
  const daysAgo = Math.floor(daysAgoMax * r ** (1 / biasRecent));
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(randomInt(8, 22), randomInt(0, 59));
  return d;
}

function randomPhotoUrl(gender: 'men' | 'women', seed: number): string {
  // randomuser.me provides free portraits, 0-99 per gender
  const idx = seed % 100;
  return `https://randomuser.me/api/portraits/${gender}/${idx}.jpg`;
}

// ==========================================
// Main
// ==========================================

async function main() {
  console.log(`[seed-bulk] Starting bulk seed: ${TOTAL_USERS} users`);

  SHARED_PASSWORD_HASH = await Bun.password.hash('SeedUser123!', { algorithm: 'bcrypt', cost: 10 });

  // Pre-fetch dependencies
  const sectionTypes = await prisma.sectionType.findMany({ where: { isActive: true } });
  const systemTheme = await prisma.resumeTheme.findFirst({ where: { isSystemTheme: true } });

  if (sectionTypes.length === 0) {
    throw new Error('No active section types found. Run base seed first.');
  }
  if (!systemTheme) {
    throw new Error('No system theme found. Run base seed first.');
  }

  console.log(`[seed-bulk] ${sectionTypes.length} section types, theme: ${systemTheme.name}`);

  const sectionTypeByKey = new Map(sectionTypes.map((st) => [st.key, st]));

  // Check if already seeded
  const existing = await prisma.user.count({ where: { username: { startsWith: SEED_PREFIX } } });
  if (existing > 0) {
    console.log(`[seed-bulk] ⚠ ${existing} seed users already exist. Skipping. Run cleanup first.`);
    return;
  }

  // 1. Build user records
  const userRecords: {
    id: string;
    tier: Tier;
    archetype: Archetype;
    name: string;
    username: string;
    email: string;
    gender: 'men' | 'women';
    yearsExp: number;
  }[] = [];

  let idx = 0;
  for (const archetype of ARCHETYPES) {
    const tiers: [Tier, number][] = [
      ['power', DISTRIBUTION[archetype.id].power],
      ['regular', DISTRIBUTION[archetype.id].regular],
      ['casual', DISTRIBUTION[archetype.id].casual],
    ];

    for (const [tier, count] of tiers) {
      for (let i = 0; i < count; i++) {
        idx++;
        const gender: 'men' | 'women' = Math.random() > 0.5 ? 'men' : 'women';
        const firstName = faker.person.firstName(gender === 'men' ? 'male' : 'female');
        const lastName = faker.person.lastName();
        const name = `${firstName} ${lastName}`;
        const usernameBase = `${firstName}${lastName}`.toLowerCase().replace(/[^a-z0-9]/g, '');
        const username = `${SEED_PREFIX}${usernameBase}${idx}`;
        const email = `seed+${idx}@${SEED_EMAIL_DOMAIN}`;
        const yearsExp =
          archetype.level === 'Senior'
            ? randomInt(5, 12)
            : archetype.level === 'Mid'
              ? randomInt(2, 5)
              : randomInt(0, 2);

        userRecords.push({ id: '', tier, archetype, name, username, email, gender, yearsExp });
      }
    }
  }

  console.log(`[seed-bulk] Planned ${userRecords.length} users`);

  // 2. Create users
  console.log('[seed-bulk] Creating users...');
  for (const u of userRecords) {
    const createdAt = weightedDate(180, 0.7);
    const bio = pick(u.archetype.bioTemplates)
      .replace('{skill}', pick(u.archetype.skills))
      .replace('{years}', String(u.yearsExp));

    const created = await prisma.user.create({
      data: {
        name: u.name,
        username: u.username,
        email: u.email,
        passwordHash: SHARED_PASSWORD_HASH,
        emailVerified: createdAt,
        photoURL: randomPhotoUrl(u.gender, userRecords.indexOf(u)),
        bio,
        location: `${faker.location.city()}, ${faker.location.country()}`,
        linkedin: `https://linkedin.com/in/${u.username}`,
        github:
          u.archetype.id === 'designer' || u.archetype.id === 'pm'
            ? null
            : `https://github.com/${u.username}`,
        hasCompletedOnboarding: u.tier !== 'casual',
        onboardingCompletedAt: u.tier !== 'casual' ? weightedDate(60, 0.5) : null,
        lastLoginAt:
          u.tier === 'power'
            ? weightedDate(3)
            : u.tier === 'regular'
              ? weightedDate(14)
              : weightedDate(60),
        createdAt,
        updatedAt: createdAt,
        roles: ['role_user'],
        isActive: true,
        preferences: {
          create: {
            language: 'pt-BR',
            theme: 'dark',
            palette: 'ocean',
            timezone: 'America/Sao_Paulo',
          },
        },
      },
    });
    u.id = created.id;
  }

  console.log(`[seed-bulk] ✓ ${userRecords.length} users created`);

  // 3. Create resumes with sections (power + regular)
  console.log('[seed-bulk] Creating resumes...');
  let resumeCount = 0;
  for (const u of userRecords) {
    if (u.tier === 'casual' && Math.random() > 0.4) continue; // only 40% of casuals have resume

    const sectionCount =
      u.tier === 'power' ? randomInt(5, 8) : u.tier === 'regular' ? randomInt(3, 5) : 2;
    const sectionKeys = pickMany(
      [
        'summary_v1',
        'work_experience_v1',
        'skill_set_v1',
        'education_v1',
        'project_v1',
        'language_v1',
        'certification_v1',
        'achievement_v1',
      ],
      sectionCount,
    );

    const resume = await prisma.resume.create({
      data: {
        userId: u.id,
        title: `${u.archetype.title(u.archetype.level)} Resume`,
        slug: `${u.username}-resume`,
        isPublic: u.tier === 'power' || (u.tier === 'regular' && Math.random() > 0.5),
        template: 'PROFESSIONAL',
        language: 'pt-br',
        primaryLanguage: 'pt-br',
        fullName: u.name,
        jobTitle: u.archetype.title(u.archetype.level),
        emailContact: u.email,
        location: faker.location.city(),
        linkedin: `https://linkedin.com/in/${u.username}`,
        github: u.archetype.id === 'designer' ? null : `https://github.com/${u.username}`,
        primaryStack: u.archetype.skills.slice(0, 5),
        techArea: u.archetype.id,
        summary: pick(u.archetype.bioTemplates)
          .replace('{skill}', pick(u.archetype.skills))
          .replace('{years}', String(u.yearsExp)),
        experienceYears: u.yearsExp,
        activeThemeId: systemTheme.id,
      },
    });

    await prisma.user.update({ where: { id: u.id }, data: { primaryResumeId: resume.id } });

    // Create sections
    for (let order = 0; order < sectionKeys.length; order++) {
      const sKey = sectionKeys[order];
      const st = sectionTypeByKey.get(sKey);
      if (!st) continue;

      const section = await prisma.resumeSection.create({
        data: {
          resumeId: resume.id,
          sectionTypeId: st.id,
          order,
          isVisible: true,
        },
      });

      // Items based on semantic kind
      const items = generateSectionItems(sKey, u);
      for (let i = 0; i < items.length; i++) {
        await prisma.sectionItem.create({
          data: {
            resumeSectionId: section.id,
            order: i,
            content: items[i] as Prisma.InputJsonValue,
            isVisible: true,
          },
        });
      }
    }

    // Analytics (ATS score)
    await prisma.resumeAnalytics.create({
      data: {
        resumeId: resume.id,
        atsScore:
          u.tier === 'power'
            ? randomInt(85, 98)
            : u.tier === 'regular'
              ? randomInt(70, 92)
              : randomInt(55, 78),
        keywordScore: randomInt(60, 95),
        completenessScore:
          u.tier === 'power'
            ? randomInt(85, 100)
            : u.tier === 'regular'
              ? randomInt(65, 90)
              : randomInt(40, 70),
        topKeywords: u.archetype.skills.slice(0, 5),
        missingKeywords: [],
        improvementSuggestions:
          u.tier === 'casual' ? ['Add more work experience', 'Include certifications'] : [],
      },
    });

    resumeCount++;
  }

  console.log(`[seed-bulk] ✓ ${resumeCount} resumes created`);

  // 4. Create social graph (follows + connections)
  console.log('[seed-bulk] Creating social graph...');
  const powerUsers = userRecords.filter((u) => u.tier === 'power');
  const _regularUsers = userRecords.filter((u) => u.tier === 'regular');
  const _casualUsers = userRecords.filter((u) => u.tier === 'casual');

  let followCount = 0;
  for (const u of userRecords) {
    // Target follow count based on tier
    const followCount_ =
      u.tier === 'power'
        ? randomInt(30, 80)
        : u.tier === 'regular'
          ? randomInt(5, 25)
          : randomInt(1, 8);

    // Bias: follow same archetype more, power users more
    const sameArchetype = userRecords.filter(
      (o) => o.archetype.id === u.archetype.id && o.id !== u.id,
    );
    const followTargets: typeof userRecords = [];

    // 40% same archetype, 30% power users, 30% random
    const sameCount = Math.floor(followCount_ * 0.4);
    followTargets.push(...pickMany(sameArchetype, sameCount));
    const powerCount = Math.floor(followCount_ * 0.3);
    followTargets.push(
      ...pickMany(
        powerUsers.filter((p) => p.id !== u.id && !followTargets.some((f) => f.id === p.id)),
        powerCount,
      ),
    );
    const otherCount = followCount_ - followTargets.length;
    const others = userRecords.filter(
      (o) => o.id !== u.id && !followTargets.some((f) => f.id === o.id),
    );
    followTargets.push(...pickMany(others, otherCount));

    for (const target of followTargets) {
      try {
        await prisma.follow.create({
          data: {
            followerId: u.id,
            followingId: target.id,
            createdAt: weightedDate(120),
          },
        });
        followCount++;
      } catch {
        // Duplicate — skip
      }
    }
  }
  console.log(`[seed-bulk] ✓ ${followCount} follows created`);

  // Connections (accepted)
  let connectionCount = 0;
  for (const u of userRecords) {
    const connCount =
      u.tier === 'power'
        ? randomInt(15, 40)
        : u.tier === 'regular'
          ? randomInt(5, 15)
          : randomInt(0, 5);
    const targets = pickMany(
      userRecords.filter((o) => o.id !== u.id),
      connCount,
    );

    for (const target of targets) {
      try {
        await prisma.connection.create({
          data: {
            requesterId: u.id,
            targetId: target.id,
            status: Math.random() > 0.2 ? 'ACCEPTED' : 'PENDING',
            createdAt: weightedDate(90),
            updatedAt: weightedDate(60),
          },
        });
        connectionCount++;
      } catch {
        // Duplicate
      }
    }
  }
  console.log(`[seed-bulk] ✓ ${connectionCount} connections created`);

  // 5. Create posts (power users only, mostly)
  console.log('[seed-bulk] Creating posts...');
  const allPosts: Post[] = [];
  const POST_TYPES: (keyof Archetype['postTemplates'])[] = [
    'ACHIEVEMENT',
    'LEARNING',
    'BUILD',
    'QUESTION',
    'OPPORTUNITY',
  ];

  for (const u of userRecords) {
    const postCount_ =
      u.tier === 'power' ? randomInt(5, 15) : u.tier === 'regular' ? randomInt(1, 3) : 0;

    for (let i = 0; i < postCount_; i++) {
      const availableTypes = POST_TYPES.filter((t) => u.archetype.postTemplates[t]?.length);
      const type = pick(availableTypes) as string;
      const template = pick(u.archetype.postTemplates[type] ?? []);
      const skill = pick(u.archetype.skills);
      const content = template
        .replace('{skill}', skill)
        .replace('{company}', pick(u.archetype.companies));

      // Random hashtags
      const hashtags = pickMany(u.archetype.hashtags, randomInt(1, 3));
      const contentWithTags = `${content}\n\n${hashtags.map((h) => `#${h}`).join(' ')}`;

      const data: Record<string, unknown> = { title: content.split('.')[0] };

      if (type === 'QUESTION') {
        data.question = content;
        data.options = [
          { text: pick(['Opcao A', 'Acho que sim', 'Sempre', 'Nunca']), votes: randomInt(0, 20) },
          {
            text: pick(['Opcao B', 'Depende', 'Mais ou menos', 'Talvez']),
            votes: randomInt(0, 20),
          },
          { text: pick(['Opcao C', 'Nao sei', 'Outro', 'Prefiro ambos']), votes: randomInt(0, 15) },
        ];
      } else if (type === 'BUILD') {
        data.project_url = `https://github.com/${u.username}/${faker.lorem.slug()}`;
      } else if (type === 'ACHIEVEMENT') {
        data.organization = pick(u.archetype.companies);
        data.date = weightedDate(180).toISOString().split('T')[0];
      } else if (type === 'OPPORTUNITY') {
        data.commitment = pick(['Full-time', 'Part-time', 'Contract']);
        data.contact_method = u.email;
      }

      const post = await prisma.post.create({
        data: {
          authorId: u.id,
          type: type as 'ACHIEVEMENT' | 'LEARNING' | 'BUILD' | 'QUESTION' | 'OPPORTUNITY',
          content: contentWithTags,
          data: data as Prisma.InputJsonValue,
          hardSkills: pickMany(u.archetype.skills, randomInt(1, 3)),
          softSkills: pickMany(u.archetype.softSkills, randomInt(0, 2)),
          hashtags,
          createdAt: weightedDate(90, 0.8),
          updatedAt: weightedDate(60),
        },
      });
      allPosts.push(post);
    }
  }
  console.log(`[seed-bulk] ✓ ${allPosts.length} posts created`);

  // 6. Reactions (likes)
  console.log('[seed-bulk] Creating reactions...');
  const REACTION_TYPES = ['LIKE', 'CELEBRATE', 'LOVE', 'INSIGHTFUL', 'CURIOUS'] as const;
  let reactionCount = 0;
  for (const post of allPosts) {
    // Power users' posts get more reactions
    const author = userRecords.find((u) => u.id === post.authorId);
    const popularity = author?.tier === 'power' ? randomInt(10, 60) : randomInt(1, 15);

    const reactors = pickMany(
      userRecords.filter((u) => u.id !== post.authorId),
      popularity,
    );
    for (const r of reactors) {
      try {
        await prisma.postLike.create({
          data: {
            postId: post.id,
            userId: r.id,
            reactionType: pick([...REACTION_TYPES]),
            createdAt: new Date(post.createdAt.getTime() + randomInt(60, 7 * 24 * 3600) * 1000),
          },
        });
        reactionCount++;
      } catch {
        // Duplicate
      }
    }

    // Update denormalized count
    await prisma.post.update({
      where: { id: post.id },
      data: { likesCount: { increment: popularity } },
    });
  }
  console.log(`[seed-bulk] ✓ ${reactionCount} reactions created`);

  // 7. Comments
  console.log('[seed-bulk] Creating comments...');
  let commentCount = 0;
  const COMMENT_TEMPLATES = [
    'Concordo 100%!',
    'Otima colocacao.',
    'Vou salvar pra reler depois.',
    'Interessante, nunca tinha pensado assim.',
    'Exatamente isso! 🙌',
    'Obrigado por compartilhar.',
    'Isso fez sentido pra mim.',
    'Tambem tive essa experiencia.',
    'Gostaria de saber mais sobre isso.',
    'Top demais!',
    'Vou testar amanha.',
    'Valeu pela dica.',
    'Concordo em partes. Depende do contexto.',
    'Tem algum conteudo extra sobre isso?',
  ];

  for (const post of allPosts) {
    const author = userRecords.find((u) => u.id === post.authorId);
    const commentTarget = author?.tier === 'power' ? randomInt(2, 12) : randomInt(0, 3);

    const commenters = pickMany(
      userRecords.filter((u) => u.id !== post.authorId),
      commentTarget,
    );
    for (const c of commenters) {
      const comment = await prisma.postComment.create({
        data: {
          postId: post.id,
          authorId: c.id,
          content: pick(COMMENT_TEMPLATES),
          createdAt: new Date(post.createdAt.getTime() + randomInt(3600, 14 * 24 * 3600) * 1000),
          updatedAt: new Date(),
        },
      });
      commentCount++;

      // 20% chance of reply
      if (Math.random() < 0.2) {
        const replier = pick(userRecords.filter((u) => u.id !== c.id));
        await prisma.postComment.create({
          data: {
            postId: post.id,
            authorId: replier.id,
            content: pick(COMMENT_TEMPLATES),
            parentId: comment.id,
            createdAt: new Date(comment.createdAt.getTime() + randomInt(300, 48 * 3600) * 1000),
            updatedAt: new Date(),
          },
        });
        commentCount++;
      }
    }

    await prisma.post.update({
      where: { id: post.id },
      data: { commentsCount: { increment: commentTarget } },
    });
  }
  console.log(`[seed-bulk] ✓ ${commentCount} comments created`);

  // 8. Poll votes for QUESTION posts
  console.log('[seed-bulk] Creating poll votes...');
  let voteCount = 0;
  for (const post of allPosts) {
    if (post.type !== 'QUESTION') continue;
    const data = post.data as { options?: Array<{ text?: string }> } | null;
    const options = data?.options;
    if (!options?.length) continue;

    const voters = pickMany(
      userRecords.filter((u) => u.id !== post.authorId),
      randomInt(5, 40),
    );
    for (const v of voters) {
      try {
        await prisma.pollVote.create({
          data: {
            postId: post.id,
            userId: v.id,
            optionIndex: randomInt(0, options.length - 1),
            createdAt: new Date(post.createdAt.getTime() + randomInt(3600, 7 * 24 * 3600) * 1000),
          },
        });
        voteCount++;
      } catch {
        // Duplicate
      }
    }

    await prisma.post.update({
      where: { id: post.id },
      data: { votesCount: { increment: voters.length } },
    });
  }
  console.log(`[seed-bulk] ✓ ${voteCount} poll votes created`);

  console.log('\n[seed-bulk] ✅ DONE');
  console.log(
    `   Users: ${userRecords.length} (${POWER_USERS} power, ${REGULAR_USERS} regular, ${CASUAL_USERS} casual)`,
  );
  console.log(`   Resumes: ${resumeCount}`);
  console.log(`   Follows: ${followCount}`);
  console.log(`   Connections: ${connectionCount}`);
  console.log(`   Posts: ${allPosts.length}`);
  console.log(`   Reactions: ${reactionCount}`);
  console.log(`   Comments: ${commentCount}`);
  console.log(`   Poll votes: ${voteCount}`);
}

// ==========================================
// Section item generators
// ==========================================

function generateSectionItems(
  key: string,
  u: { archetype: Archetype; yearsExp: number; name: string },
): Array<Record<string, unknown>> {
  switch (key) {
    case 'summary_v1':
      return [
        {
          summary: pick(u.archetype.bioTemplates)
            .replace('{skill}', pick(u.archetype.skills))
            .replace('{years}', String(u.yearsExp)),
        },
      ];

    case 'work_experience_v1': {
      const count =
        u.archetype.level === 'Senior'
          ? randomInt(3, 5)
          : u.archetype.level === 'Mid'
            ? randomInt(2, 3)
            : randomInt(1, 2);
      const items: Record<string, unknown>[] = [];
      let endYear = new Date().getFullYear();
      for (let i = 0; i < count; i++) {
        const duration = randomInt(1, 3);
        const startYear = endYear - duration;
        items.push({
          company: pick(u.archetype.companies),
          role: u.archetype.title(i === 0 ? u.archetype.level : 'Junior'),
          startDate: `${startYear}-${String(randomInt(1, 12)).padStart(2, '0')}-01`,
          endDate: i === 0 ? null : `${endYear}-${String(randomInt(1, 12)).padStart(2, '0')}-01`,
          current: i === 0,
          description: `Trabalhando com ${pickMany(u.archetype.skills, 3).join(', ')}. ${faker.company.catchPhrase()}.`,
          location: faker.location.city(),
        });
        endYear = startYear;
      }
      return items;
    }

    case 'skill_set_v1':
      return pickMany(u.archetype.skills, randomInt(5, 10)).map((name) => ({
        name,
        level: pick(['Beginner', 'Intermediate', 'Advanced', 'Expert']),
        category: pick(['Programming', 'Framework', 'Tool', 'Database']),
      }));

    case 'education_v1':
      return [
        {
          institution: faker.helpers.arrayElement([
            'USP',
            'UFMG',
            'UFRJ',
            'UNICAMP',
            'PUC',
            'FATEC',
            'Mackenzie',
          ]),
          degree: pick(['Bacharelado', 'Tecnologo', 'Mestrado', 'Bacharelado', 'Bootcamp']),
          field: pick([
            'Ciencia da Computacao',
            'Engenharia de Software',
            'Analise e Desenvolvimento de Sistemas',
            'Sistemas de Informacao',
          ]),
          startDate: `${new Date().getFullYear() - 4 - u.yearsExp}-01-01`,
          endDate: `${new Date().getFullYear() - u.yearsExp}-12-01`,
        },
      ];

    case 'project_v1':
      return Array.from({ length: randomInt(2, 4) }).map(() => ({
        name: `${faker.hacker.noun()}-${faker.hacker.verb()}`,
        description: faker.hacker.phrase(),
        url: `https://github.com/${faker.internet.username()}/${faker.lorem.slug()}`,
        technologies: pickMany(u.archetype.skills, randomInt(2, 5)),
        year: String(new Date().getFullYear() - randomInt(0, 3)),
      }));

    case 'language_v1':
      return [
        { name: 'Portuguese', level: 'Native', proficiency: 'Native' },
        {
          name: 'English',
          level: pick(['Intermediate', 'Advanced', 'Fluent']),
          proficiency: pick(['B2', 'C1', 'C2']),
        },
        ...(Math.random() > 0.7
          ? [
              {
                name: 'Spanish',
                level: pick(['Basic', 'Intermediate']),
                proficiency: pick(['A2', 'B1', 'B2']),
              },
            ]
          : []),
      ];

    case 'certification_v1':
      return Array.from({ length: randomInt(1, 3) }).map(() => ({
        name: pick([
          'AWS Solutions Architect',
          'Google Cloud Professional',
          'Scrum Master',
          'CKA',
          'HashiCorp Terraform Associate',
          'React Advanced',
        ]),
        issuer: pick(['AWS', 'Google', 'Scrum Alliance', 'CNCF', 'HashiCorp', 'Meta']),
        issueDate: `${new Date().getFullYear() - randomInt(0, 3)}-${String(randomInt(1, 12)).padStart(2, '0')}-01`,
        credentialUrl: `https://credentials.example.com/${faker.string.alphanumeric(10)}`,
      }));

    case 'achievement_v1':
      return Array.from({ length: randomInt(1, 3) }).map(() => ({
        title: faker.company.buzzPhrase(),
        description: faker.lorem.sentence(),
        date: `${new Date().getFullYear() - randomInt(0, 2)}-${String(randomInt(1, 12)).padStart(2, '0')}-01`,
      }));

    default:
      return [{ description: faker.lorem.sentence() }];
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('[seed-bulk] ❌ Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
