/**
 * Tech Skills Catalog Seed
 *
 * Seeds TechArea, TechNiche, TechSkill, and ProgrammingLanguage tables.
 */

import type { PrismaClient } from '@prisma/client';

export async function seedTechSkills(prisma: PrismaClient): Promise<void> {
  console.log('🛠️  Seeding tech skills catalog...');

  // ── Tech Areas ──────────────────────────────────────────────────────
  const areas = [
    {
      type: 'DEVELOPMENT' as const,
      nameEn: 'Development',
      namePtBr: 'Desenvolvimento',
      descriptionEn: 'Software development and programming',
      descriptionPtBr: 'Desenvolvimento de software e programação',
      icon: '💻',
      order: 1,
    },
    {
      type: 'DEVOPS' as const,
      nameEn: 'DevOps',
      namePtBr: 'DevOps',
      descriptionEn: 'Development operations and CI/CD',
      descriptionPtBr: 'Operações de desenvolvimento e CI/CD',
      icon: '🔧',
      order: 2,
    },
    {
      type: 'DATA' as const,
      nameEn: 'Data',
      namePtBr: 'Dados',
      descriptionEn: 'Data engineering and analysis',
      descriptionPtBr: 'Engenharia e análise de dados',
      icon: '📊',
      order: 3,
    },
    {
      type: 'SECURITY' as const,
      nameEn: 'Security',
      namePtBr: 'Segurança',
      descriptionEn: 'Information security and cybersecurity',
      descriptionPtBr: 'Segurança da informação e cibersegurança',
      icon: '🔒',
      order: 4,
    },
    {
      type: 'DESIGN' as const,
      nameEn: 'Design',
      namePtBr: 'Design',
      descriptionEn: 'UI/UX design and visual design',
      descriptionPtBr: 'Design de UI/UX e design visual',
      icon: '🎨',
      order: 5,
    },
    {
      type: 'PRODUCT' as const,
      nameEn: 'Product',
      namePtBr: 'Produto',
      descriptionEn: 'Product management and strategy',
      descriptionPtBr: 'Gestão e estratégia de produto',
      icon: '📋',
      order: 6,
    },
    {
      type: 'QA' as const,
      nameEn: 'Quality Assurance',
      namePtBr: 'Garantia de Qualidade',
      descriptionEn: 'Testing and quality assurance',
      descriptionPtBr: 'Testes e garantia de qualidade',
      icon: '✅',
      order: 7,
    },
    {
      type: 'INFRASTRUCTURE' as const,
      nameEn: 'Infrastructure',
      namePtBr: 'Infraestrutura',
      descriptionEn: 'Cloud and infrastructure management',
      descriptionPtBr: 'Gestão de nuvem e infraestrutura',
      icon: '☁️',
      order: 8,
    },
    {
      type: 'OTHER' as const,
      nameEn: 'Other',
      namePtBr: 'Outros',
      descriptionEn: 'Other technical skills',
      descriptionPtBr: 'Outras habilidades técnicas',
      icon: '📦',
      order: 9,
    },
  ];

  const areaMap = new Map<string, string>();

  for (const area of areas) {
    const result = await prisma.techArea.upsert({
      where: { type: area.type },
      create: area,
      update: {
        nameEn: area.nameEn,
        namePtBr: area.namePtBr,
        descriptionEn: area.descriptionEn,
        descriptionPtBr: area.descriptionPtBr,
        icon: area.icon,
        order: area.order,
      },
    });
    areaMap.set(area.type, result.id);
  }

  console.log(`  ✓ ${areas.length} tech areas`);

  // ── Tech Niches ─────────────────────────────────────────────────────
  const niches = [
    {
      slug: 'frontend',
      nameEn: 'Frontend',
      namePtBr: 'Frontend',
      descriptionEn: 'Frontend web development',
      descriptionPtBr: 'Desenvolvimento web frontend',
      areaType: 'DEVELOPMENT',
      order: 1,
    },
    {
      slug: 'backend',
      nameEn: 'Backend',
      namePtBr: 'Backend',
      descriptionEn: 'Backend development and APIs',
      descriptionPtBr: 'Desenvolvimento backend e APIs',
      areaType: 'DEVELOPMENT',
      order: 2,
    },
    {
      slug: 'mobile',
      nameEn: 'Mobile',
      namePtBr: 'Mobile',
      descriptionEn: 'Mobile app development',
      descriptionPtBr: 'Desenvolvimento de apps mobile',
      areaType: 'DEVELOPMENT',
      order: 3,
    },
    {
      slug: 'fullstack',
      nameEn: 'Full Stack',
      namePtBr: 'Full Stack',
      descriptionEn: 'Full stack development',
      descriptionPtBr: 'Desenvolvimento full stack',
      areaType: 'DEVELOPMENT',
      order: 4,
    },
    {
      slug: 'ci-cd',
      nameEn: 'CI/CD',
      namePtBr: 'CI/CD',
      descriptionEn: 'Continuous integration and delivery',
      descriptionPtBr: 'Integração e entrega contínua',
      areaType: 'DEVOPS',
      order: 1,
    },
    {
      slug: 'containers',
      nameEn: 'Containers',
      namePtBr: 'Containers',
      descriptionEn: 'Container orchestration',
      descriptionPtBr: 'Orquestração de containers',
      areaType: 'DEVOPS',
      order: 2,
    },
    {
      slug: 'data-engineering',
      nameEn: 'Data Engineering',
      namePtBr: 'Engenharia de Dados',
      descriptionEn: 'Data pipelines and ETL',
      descriptionPtBr: 'Pipelines de dados e ETL',
      areaType: 'DATA',
      order: 1,
    },
    {
      slug: 'machine-learning',
      nameEn: 'Machine Learning',
      namePtBr: 'Aprendizado de Máquina',
      descriptionEn: 'ML and AI',
      descriptionPtBr: 'ML e IA',
      areaType: 'DATA',
      order: 2,
    },
    {
      slug: 'cloud-platforms',
      nameEn: 'Cloud Platforms',
      namePtBr: 'Plataformas Cloud',
      descriptionEn: 'Cloud infrastructure platforms',
      descriptionPtBr: 'Plataformas de infraestrutura cloud',
      areaType: 'INFRASTRUCTURE',
      order: 1,
    },
    {
      slug: 'testing',
      nameEn: 'Testing',
      namePtBr: 'Testes',
      descriptionEn: 'Software testing and automation',
      descriptionPtBr: 'Testes de software e automação',
      areaType: 'QA',
      order: 1,
    },
  ];

  const nicheMap = new Map<string, string>();

  for (const niche of niches) {
    const areaId = areaMap.get(niche.areaType);
    if (!areaId) continue;

    const result = await prisma.techNiche.upsert({
      where: { slug: niche.slug },
      create: {
        slug: niche.slug,
        nameEn: niche.nameEn,
        namePtBr: niche.namePtBr,
        descriptionEn: niche.descriptionEn,
        descriptionPtBr: niche.descriptionPtBr,
        areaId,
        order: niche.order,
      },
      update: {
        nameEn: niche.nameEn,
        namePtBr: niche.namePtBr,
        descriptionEn: niche.descriptionEn,
        descriptionPtBr: niche.descriptionPtBr,
        order: niche.order,
      },
    });
    nicheMap.set(niche.slug, result.id);
  }

  console.log(`  ✓ ${niches.length} tech niches`);

  // ── Tech Skills ─────────────────────────────────────────────────────
  const skills = [
    {
      slug: 'javascript',
      nameEn: 'JavaScript',
      namePtBr: 'JavaScript',
      type: 'LANGUAGE' as const,
      nicheSlug: 'frontend',
      popularity: 100,
      aliases: ['js'],
      keywords: ['web', 'browser', 'node'],
    },
    {
      slug: 'typescript',
      nameEn: 'TypeScript',
      namePtBr: 'TypeScript',
      type: 'LANGUAGE' as const,
      nicheSlug: 'frontend',
      popularity: 95,
      aliases: ['ts'],
      keywords: ['typed', 'web'],
    },
    {
      slug: 'python',
      nameEn: 'Python',
      namePtBr: 'Python',
      type: 'LANGUAGE' as const,
      nicheSlug: 'backend',
      popularity: 98,
      aliases: ['py'],
      keywords: ['scripting', 'ml', 'data'],
    },
    {
      slug: 'java',
      nameEn: 'Java',
      namePtBr: 'Java',
      type: 'LANGUAGE' as const,
      nicheSlug: 'backend',
      popularity: 90,
      aliases: [],
      keywords: ['jvm', 'enterprise'],
    },
    {
      slug: 'csharp',
      nameEn: 'C#',
      namePtBr: 'C#',
      type: 'LANGUAGE' as const,
      nicheSlug: 'backend',
      popularity: 80,
      aliases: ['c-sharp'],
      keywords: ['dotnet', '.net'],
    },
    {
      slug: 'go',
      nameEn: 'Go',
      namePtBr: 'Go',
      type: 'LANGUAGE' as const,
      nicheSlug: 'backend',
      popularity: 75,
      aliases: ['golang'],
      keywords: ['concurrency', 'cloud'],
    },
    {
      slug: 'rust',
      nameEn: 'Rust',
      namePtBr: 'Rust',
      type: 'LANGUAGE' as const,
      nicheSlug: 'backend',
      popularity: 70,
      aliases: [],
      keywords: ['systems', 'performance'],
    },
    {
      slug: 'react',
      nameEn: 'React',
      namePtBr: 'React',
      type: 'FRAMEWORK' as const,
      nicheSlug: 'frontend',
      popularity: 95,
      aliases: ['reactjs'],
      keywords: ['ui', 'spa', 'components'],
    },
    {
      slug: 'nextjs',
      nameEn: 'Next.js',
      namePtBr: 'Next.js',
      type: 'FRAMEWORK' as const,
      nicheSlug: 'fullstack',
      popularity: 85,
      aliases: ['next'],
      keywords: ['ssr', 'react', 'fullstack'],
    },
    {
      slug: 'nodejs',
      nameEn: 'Node.js',
      namePtBr: 'Node.js',
      type: 'PLATFORM' as const,
      nicheSlug: 'backend',
      popularity: 92,
      aliases: ['node'],
      keywords: ['runtime', 'javascript', 'server'],
    },
    {
      slug: 'nestjs',
      nameEn: 'NestJS',
      namePtBr: 'NestJS',
      type: 'FRAMEWORK' as const,
      nicheSlug: 'backend',
      popularity: 70,
      aliases: ['nest'],
      keywords: ['typescript', 'api', 'enterprise'],
    },
    {
      slug: 'docker',
      nameEn: 'Docker',
      namePtBr: 'Docker',
      type: 'TOOL' as const,
      nicheSlug: 'containers',
      popularity: 90,
      aliases: [],
      keywords: ['containers', 'devops'],
    },
    {
      slug: 'kubernetes',
      nameEn: 'Kubernetes',
      namePtBr: 'Kubernetes',
      type: 'TOOL' as const,
      nicheSlug: 'containers',
      popularity: 80,
      aliases: ['k8s'],
      keywords: ['orchestration', 'containers'],
    },
    {
      slug: 'postgresql',
      nameEn: 'PostgreSQL',
      namePtBr: 'PostgreSQL',
      type: 'DATABASE' as const,
      nicheSlug: 'backend',
      popularity: 88,
      aliases: ['postgres'],
      keywords: ['sql', 'relational'],
    },
    {
      slug: 'mongodb',
      nameEn: 'MongoDB',
      namePtBr: 'MongoDB',
      type: 'DATABASE' as const,
      nicheSlug: 'backend',
      popularity: 75,
      aliases: ['mongo'],
      keywords: ['nosql', 'document'],
    },
    {
      slug: 'redis',
      nameEn: 'Redis',
      namePtBr: 'Redis',
      type: 'DATABASE' as const,
      nicheSlug: 'backend',
      popularity: 78,
      aliases: [],
      keywords: ['cache', 'in-memory'],
    },
    {
      slug: 'aws',
      nameEn: 'AWS',
      namePtBr: 'AWS',
      type: 'PLATFORM' as const,
      nicheSlug: 'cloud-platforms',
      popularity: 92,
      aliases: ['amazon-web-services'],
      keywords: ['cloud', 'amazon'],
    },
    {
      slug: 'git',
      nameEn: 'Git',
      namePtBr: 'Git',
      type: 'TOOL' as const,
      nicheSlug: 'ci-cd',
      popularity: 99,
      aliases: [],
      keywords: ['version-control', 'scm'],
    },
    {
      slug: 'terraform',
      nameEn: 'Terraform',
      namePtBr: 'Terraform',
      type: 'TOOL' as const,
      nicheSlug: 'cloud-platforms',
      popularity: 72,
      aliases: ['tf'],
      keywords: ['iac', 'infrastructure'],
    },
    {
      slug: 'react-native',
      nameEn: 'React Native',
      namePtBr: 'React Native',
      type: 'FRAMEWORK' as const,
      nicheSlug: 'mobile',
      popularity: 78,
      aliases: ['rn'],
      keywords: ['mobile', 'cross-platform'],
    },
    {
      slug: 'jest',
      nameEn: 'Jest',
      namePtBr: 'Jest',
      type: 'TOOL' as const,
      nicheSlug: 'testing',
      popularity: 80,
      aliases: [],
      keywords: ['testing', 'unit-test'],
    },
    {
      slug: 'tensorflow',
      nameEn: 'TensorFlow',
      namePtBr: 'TensorFlow',
      type: 'FRAMEWORK' as const,
      nicheSlug: 'machine-learning',
      popularity: 75,
      aliases: ['tf-ml'],
      keywords: ['ml', 'deep-learning'],
    },
  ];

  for (const skill of skills) {
    const nicheId = nicheMap.get(skill.nicheSlug) ?? null;

    await prisma.techSkill.upsert({
      where: { slug: skill.slug },
      create: {
        slug: skill.slug,
        nameEn: skill.nameEn,
        namePtBr: skill.namePtBr,
        type: skill.type,
        nicheId,
        popularity: skill.popularity,
        aliases: skill.aliases,
        keywords: skill.keywords,
      },
      update: {
        nameEn: skill.nameEn,
        namePtBr: skill.namePtBr,
        type: skill.type,
        popularity: skill.popularity,
      },
    });
  }

  console.log(`  ✓ ${skills.length} tech skills`);

  // ── Programming Languages ───────────────────────────────────────────
  const languages = [
    {
      slug: 'javascript',
      nameEn: 'JavaScript',
      namePtBr: 'JavaScript',
      paradigms: ['multi-paradigm', 'event-driven', 'functional'],
      typing: 'dynamic',
      fileExtensions: ['.js', '.mjs', '.cjs'],
      popularity: 100,
      website: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
    },
    {
      slug: 'typescript',
      nameEn: 'TypeScript',
      namePtBr: 'TypeScript',
      paradigms: ['multi-paradigm', 'object-oriented'],
      typing: 'static',
      fileExtensions: ['.ts', '.tsx'],
      popularity: 95,
      website: 'https://www.typescriptlang.org',
    },
    {
      slug: 'python',
      nameEn: 'Python',
      namePtBr: 'Python',
      paradigms: ['multi-paradigm', 'object-oriented', 'functional'],
      typing: 'dynamic',
      fileExtensions: ['.py'],
      popularity: 98,
      website: 'https://www.python.org',
    },
    {
      slug: 'java',
      nameEn: 'Java',
      namePtBr: 'Java',
      paradigms: ['object-oriented'],
      typing: 'static',
      fileExtensions: ['.java'],
      popularity: 90,
      website: 'https://www.java.com',
    },
    {
      slug: 'csharp',
      nameEn: 'C#',
      namePtBr: 'C#',
      paradigms: ['multi-paradigm', 'object-oriented'],
      typing: 'static',
      fileExtensions: ['.cs'],
      popularity: 80,
      website: 'https://learn.microsoft.com/en-us/dotnet/csharp/',
    },
    {
      slug: 'go',
      nameEn: 'Go',
      namePtBr: 'Go',
      paradigms: ['concurrent', 'imperative'],
      typing: 'static',
      fileExtensions: ['.go'],
      popularity: 75,
      website: 'https://go.dev',
    },
    {
      slug: 'rust',
      nameEn: 'Rust',
      namePtBr: 'Rust',
      paradigms: ['multi-paradigm', 'systems'],
      typing: 'static',
      fileExtensions: ['.rs'],
      popularity: 70,
      website: 'https://www.rust-lang.org',
    },
    {
      slug: 'kotlin',
      nameEn: 'Kotlin',
      namePtBr: 'Kotlin',
      paradigms: ['multi-paradigm', 'object-oriented', 'functional'],
      typing: 'static',
      fileExtensions: ['.kt', '.kts'],
      popularity: 65,
      website: 'https://kotlinlang.org',
    },
    {
      slug: 'swift',
      nameEn: 'Swift',
      namePtBr: 'Swift',
      paradigms: ['multi-paradigm', 'protocol-oriented'],
      typing: 'static',
      fileExtensions: ['.swift'],
      popularity: 60,
      website: 'https://swift.org',
    },
    {
      slug: 'ruby',
      nameEn: 'Ruby',
      namePtBr: 'Ruby',
      paradigms: ['multi-paradigm', 'object-oriented'],
      typing: 'dynamic',
      fileExtensions: ['.rb'],
      popularity: 55,
      website: 'https://www.ruby-lang.org',
    },
    {
      slug: 'php',
      nameEn: 'PHP',
      namePtBr: 'PHP',
      paradigms: ['multi-paradigm', 'imperative'],
      typing: 'dynamic',
      fileExtensions: ['.php'],
      popularity: 60,
      website: 'https://www.php.net',
    },
    {
      slug: 'cpp',
      nameEn: 'C++',
      namePtBr: 'C++',
      paradigms: ['multi-paradigm', 'object-oriented'],
      typing: 'static',
      fileExtensions: ['.cpp', '.cc', '.h', '.hpp'],
      popularity: 70,
      website: 'https://isocpp.org',
    },
  ];

  for (const lang of languages) {
    await prisma.programmingLanguage.upsert({
      where: { slug: lang.slug },
      create: {
        slug: lang.slug,
        nameEn: lang.nameEn,
        namePtBr: lang.namePtBr,
        paradigms: lang.paradigms,
        typing: lang.typing,
        fileExtensions: lang.fileExtensions,
        popularity: lang.popularity,
        website: lang.website,
        aliases: [],
      },
      update: {
        nameEn: lang.nameEn,
        namePtBr: lang.namePtBr,
        popularity: lang.popularity,
      },
    });
  }

  console.log(`  ✓ ${languages.length} programming languages`);
  console.log('✅ Tech skills catalog seeded successfully!');
}
