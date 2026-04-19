import { PrismaClient } from '@prisma/client';

const JOBS = [
  {
    title: 'Senior Frontend Engineer',
    company: 'Nubank',
    location: 'Remoto (Brasil)',
    jobType: 'FULL_TIME',
    description:
      'Buscamos um(a) Frontend Engineer experiente para atuar no time de experiência do cliente. Você vai trabalhar com React, TypeScript e micro-frontends em um dos maiores bancos digitais do mundo.\n\nResponsabilidades:\n- Desenvolver e manter interfaces de alta performance\n- Colaborar com designers e product managers\n- Mentorear desenvolvedores mais juniores\n- Participar de decisões arquiteturais',
    requirements: [
      'React avançado (hooks, context, suspense)',
      'TypeScript',
      'Testes automatizados (Jest, Testing Library)',
      'Experiência com design systems',
      'CI/CD',
    ],
    skills: ['React', 'TypeScript', 'Next.js', 'Jest', 'GraphQL', 'Tailwind CSS'],
    salaryRange: 'R$ 18.000 - R$ 25.000',
    applyUrl: 'https://nubank.com.br/carreiras',
  },
  {
    title: 'Backend Engineer - Node.js',
    company: 'iFood',
    location: 'Remoto (Brasil)',
    jobType: 'FULL_TIME',
    description:
      'Venha fazer parte do time que alimenta milhões de brasileiros! Procuramos backend engineers para construir APIs escaláveis que suportam milhares de requisições por segundo.\n\nO que você vai fazer:\n- Projetar e implementar microsserviços\n- Otimizar queries e performance de banco de dados\n- Trabalhar com mensageria e eventos assíncronos\n- Garantir observabilidade e resiliência dos sistemas',
    requirements: [
      'Node.js / TypeScript',
      'PostgreSQL ou MySQL',
      'Redis',
      'Docker e Kubernetes',
      'Arquitetura de microsserviços',
    ],
    skills: ['Node.js', 'TypeScript', 'PostgreSQL', 'Redis', 'Docker', 'Kafka'],
    salaryRange: 'R$ 15.000 - R$ 22.000',
    applyUrl: 'https://carreiras.ifood.com.br',
  },
  {
    title: 'Fullstack Developer',
    company: 'Loft',
    location: 'São Paulo, SP (Híbrido)',
    jobType: 'FULL_TIME',
    description:
      'A Loft está transformando o mercado imobiliário com tecnologia. Buscamos um(a) Fullstack Developer para trabalhar em produtos que impactam a vida de milhares de pessoas.\n\nVocê vai:\n- Desenvolver features end-to-end\n- Trabalhar com React no frontend e Node.js no backend\n- Contribuir para a evolução da nossa plataforma\n- Participar de code reviews e pair programming',
    requirements: [
      'React + TypeScript',
      'Node.js com Express ou NestJS',
      'SQL (PostgreSQL)',
      'Git',
      '3+ anos de experiência',
    ],
    skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'NestJS', 'AWS'],
    salaryRange: 'R$ 14.000 - R$ 20.000',
    applyUrl: 'https://loft.com.br/carreiras',
  },
  {
    title: 'DevOps Engineer',
    company: 'PicPay',
    location: 'Remoto (Brasil)',
    jobType: 'FULL_TIME',
    description:
      'Procuramos um(a) DevOps Engineer para fortalecer nossa infraestrutura e acelerar entregas. Você vai trabalhar com cloud, automação e observabilidade em escala.\n\nDesafios:\n- Gerenciar clusters Kubernetes em produção\n- Automatizar pipelines de CI/CD\n- Implementar Infrastructure as Code\n- Monitoramento e alertas proativos',
    requirements: [
      'AWS ou GCP',
      'Kubernetes',
      'Terraform ou Pulumi',
      'CI/CD (GitHub Actions, GitLab CI)',
      'Linux avançado',
    ],
    skills: ['AWS', 'Kubernetes', 'Terraform', 'Docker', 'GitHub Actions', 'Linux'],
    salaryRange: 'R$ 16.000 - R$ 24.000',
    applyUrl: 'https://picpay.com/carreiras',
  },
  {
    title: 'Data Engineer',
    company: 'Mercado Livre',
    location: 'Remoto (LATAM)',
    jobType: 'FULL_TIME',
    description:
      'Junte-se ao maior ecossistema de e-commerce da América Latina! Buscamos Data Engineers para construir pipelines de dados que processam bilhões de eventos por dia.\n\nO que esperamos:\n- Construir e manter data pipelines em larga escala\n- Modelagem de dados para data warehouses\n- Otimização de custos e performance\n- Colaborar com times de Data Science e Analytics',
    requirements: [
      'Python ou Scala',
      'Apache Spark',
      'SQL avançado',
      'AWS (S3, Glue, Redshift) ou equivalente',
      'Airflow ou similar',
    ],
    skills: ['Python', 'Spark', 'SQL', 'AWS', 'Airflow', 'dbt'],
    salaryRange: 'USD 4.000 - USD 7.000',
    applyUrl: 'https://careers.mercadolibre.com',
  },
  {
    title: 'Mobile Developer (React Native)',
    company: 'Gympass (Wellhub)',
    location: 'Remoto (Brasil)',
    jobType: 'FULL_TIME',
    description:
      'Desenvolva o app que conecta milhões de pessoas a bem-estar e saúde. Buscamos mobile developers para evoluir nossa experiência mobile.\n\nVocê vai:\n- Desenvolver features no app React Native\n- Garantir performance e UX de qualidade\n- Trabalhar com testes automatizados\n- Integrar com APIs REST e GraphQL',
    requirements: [
      'React Native',
      'TypeScript',
      'iOS e Android fundamentals',
      'Testes (Jest, Detox)',
      'Publicação em lojas (App Store, Play Store)',
    ],
    skills: ['React Native', 'TypeScript', 'iOS', 'Android', 'Jest', 'GraphQL'],
    salaryRange: 'R$ 14.000 - R$ 21.000',
    applyUrl: 'https://wellhub.com/careers',
  },
  {
    title: 'Security Engineer',
    company: 'C6 Bank',
    location: 'São Paulo, SP (Híbrido)',
    jobType: 'FULL_TIME',
    description:
      'Proteja um dos bancos digitais mais inovadores do Brasil. Buscamos Security Engineers para fortalecer nossa postura de segurança.\n\nResponsabilidades:\n- Realizar threat modeling e security reviews\n- Implementar e manter ferramentas de segurança (SAST, DAST, SCA)\n- Responder a incidentes de segurança\n- Treinar times de desenvolvimento em práticas seguras',
    requirements: [
      'OWASP Top 10',
      'Pentest ou AppSec',
      'Cloud Security (AWS)',
      'Scripting (Python, Bash)',
      'Certificações desejáveis (OSCP, CEH)',
    ],
    skills: ['AppSec', 'AWS', 'Python', 'OWASP', 'Kubernetes', 'Terraform'],
    salaryRange: 'R$ 18.000 - R$ 28.000',
    applyUrl: 'https://c6bank.com.br/carreiras',
  },
  {
    title: 'Product Designer (UX/UI)',
    company: 'Stone',
    location: 'Remoto (Brasil)',
    jobType: 'FULL_TIME',
    description:
      'Desenhe experiências que simplificam a vida de empreendedores brasileiros. Buscamos designers que combinam pesquisa com craft visual.\n\nO que você vai fazer:\n- Conduzir pesquisas com usuários\n- Criar wireframes, protótipos e interfaces finais\n- Manter e evoluir o design system\n- Trabalhar próximo a PMs e engenheiros',
    requirements: [
      'Figma avançado',
      'Design System',
      'Pesquisa com usuário',
      'Prototipação',
      'Noções de acessibilidade',
    ],
    skills: ['Figma', 'Design System', 'UX Research', 'Prototyping', 'HTML', 'CSS'],
    salaryRange: 'R$ 12.000 - R$ 18.000',
    applyUrl: 'https://stone.com.br/carreiras',
  },
  {
    title: 'Estagiário(a) em Desenvolvimento Web',
    company: 'TOTVS',
    location: 'São Paulo, SP (Presencial)',
    jobType: 'INTERNSHIP',
    description:
      'Comece sua carreira em tech na maior empresa de tecnologia do Brasil! Nosso programa de estágio oferece mentoria, projetos reais e crescimento acelerado.\n\nO que você vai aprender:\n- Desenvolvimento web com React e Node.js\n- Metodologias ágeis (Scrum)\n- Versionamento com Git\n- Boas práticas de código',
    requirements: [
      'Cursando Ciência da Computação ou áreas correlatas',
      'Conhecimento básico em HTML, CSS e JavaScript',
      'Disponibilidade de 30h semanais',
      'Vontade de aprender',
    ],
    skills: ['JavaScript', 'HTML', 'CSS', 'React', 'Git'],
    salaryRange: 'R$ 2.500 - R$ 3.500',
    applyUrl: 'https://totvs.com/carreiras',
  },
  {
    title: 'Tech Lead - Backend',
    company: 'Creditas',
    location: 'Remoto (Brasil)',
    jobType: 'FULL_TIME',
    description:
      'Lidere um squad de backend engineers em uma das fintechs mais promissoras do Brasil. Buscamos líderes técnicos que equilibram excelência técnica com habilidades de gestão de pessoas.\n\nVocê vai:\n- Liderar tecnicamente um squad de 4-6 engenheiros\n- Definir arquitetura e padrões técnicos\n- Participar de decisões de produto\n- Mentorear e desenvolver o time\n- Garantir qualidade e entregas consistentes',
    requirements: [
      '7+ anos de experiência com backend',
      'Experiência com liderança técnica',
      'Arquitetura de microsserviços',
      'Node.js, Go ou Java',
      'PostgreSQL, Redis, Kafka',
    ],
    skills: ['Node.js', 'Go', 'PostgreSQL', 'Kafka', 'Kubernetes', 'System Design'],
    salaryRange: 'R$ 25.000 - R$ 35.000',
    applyUrl: 'https://creditas.com/carreiras',
  },
  {
    title: 'SRE (Site Reliability Engineer)',
    company: 'Globo',
    location: 'Rio de Janeiro, RJ (Híbrido)',
    jobType: 'FULL_TIME',
    description:
      'Garanta a disponibilidade dos serviços que atendem milhões de brasileiros todos os dias. Buscamos SREs para manter e evoluir nossa infraestrutura de streaming e conteúdo digital.\n\nDesafios:\n- SLOs/SLIs e error budgets\n- Automação de operações\n- Capacity planning para grandes eventos ao vivo\n- Incident management e post-mortems',
    requirements: [
      'Linux avançado',
      'Kubernetes e Docker',
      'Observabilidade (Prometheus, Grafana, Datadog)',
      'IaC (Terraform)',
      'Python ou Go para automação',
    ],
    skills: ['Kubernetes', 'Terraform', 'Prometheus', 'Grafana', 'Go', 'AWS'],
    salaryRange: 'R$ 18.000 - R$ 26.000',
    applyUrl: 'https://globo.com/carreiras',
  },
  {
    title: 'Machine Learning Engineer',
    company: 'Itaú Unibanco',
    location: 'São Paulo, SP (Híbrido)',
    jobType: 'FULL_TIME',
    description:
      'Aplique Machine Learning em escala no maior banco privado da América Latina. Buscamos ML Engineers para colocar modelos em produção e gerar impacto real nos produtos.\n\nVocê vai:\n- Treinar e deployar modelos de ML\n- Construir MLOps pipelines\n- Trabalhar com feature stores e model monitoring\n- Colaborar com cientistas de dados e engenheiros de dados',
    requirements: [
      'Python (scikit-learn, PyTorch ou TensorFlow)',
      'MLOps (MLflow, Kubeflow ou SageMaker)',
      'SQL',
      'Docker e Kubernetes',
      'Estatística e probabilidade',
    ],
    skills: ['Python', 'PyTorch', 'MLflow', 'Docker', 'SQL', 'Kubernetes'],
    salaryRange: 'R$ 20.000 - R$ 30.000',
    applyUrl: 'https://itau.com.br/carreiras',
  },
  {
    title: 'QA Engineer (Automation)',
    company: 'Hotmart',
    location: 'Remoto (Brasil)',
    jobType: 'FULL_TIME',
    description:
      'Garanta a qualidade da plataforma líder em produtos digitais da América Latina. Buscamos QA Engineers focados em automação de testes.\n\nO que esperamos:\n- Desenvolver e manter suítes de testes automatizados\n- Testes de API, UI e performance\n- Integrar testes no pipeline de CI/CD\n- Definir estratégias de teste por feature',
    requirements: [
      'Cypress, Playwright ou Selenium',
      'Testes de API (Postman, RestAssured)',
      'JavaScript ou TypeScript',
      'CI/CD',
      'BDD ou TDD',
    ],
    skills: ['Cypress', 'Playwright', 'TypeScript', 'Jest', 'Postman', 'GitHub Actions'],
    salaryRange: 'R$ 10.000 - R$ 16.000',
    applyUrl: 'https://hotmart.com/carreiras',
  },
  {
    title: 'Freelancer - Landing Page Developer',
    company: 'Patch Careers',
    location: 'Remoto',
    jobType: 'FREELANCE',
    description:
      'Procuramos um(a) freelancer para criar landing pages de alta conversão para nossos clientes. Projetos pontuais com possibilidade de recorrência.\n\nEscopo:\n- Desenvolvimento de landing pages responsivas\n- Otimização de performance (Core Web Vitals)\n- Integração com ferramentas de marketing\n- Entrega em 5-10 dias úteis por projeto',
    requirements: [
      'HTML, CSS, JavaScript',
      'Tailwind CSS ou similar',
      'SEO básico',
      'Performance web',
      'Portfolio com exemplos',
    ],
    skills: ['HTML', 'CSS', 'JavaScript', 'Tailwind CSS', 'SEO'],
    salaryRange: 'R$ 3.000 - R$ 8.000 por projeto',
    applyUrl: 'mailto:vagas@patchcareers.org',
  },
  {
    title: 'Desenvolvedor(a) Go - Plataforma de Pagamentos',
    company: 'PagSeguro',
    location: 'São Paulo, SP (Híbrido)',
    jobType: 'FULL_TIME',
    description:
      'Construa sistemas de pagamento que processam milhões de transações. Buscamos desenvolvedores Go para nossa plataforma core.\n\nVocê vai:\n- Desenvolver microsserviços em Go\n- Trabalhar com alta disponibilidade e baixa latência\n- Implementar sistemas event-driven\n- Garantir segurança e compliance PCI-DSS',
    requirements: [
      'Go (Golang)',
      'Microsserviços',
      'gRPC e REST APIs',
      'PostgreSQL e Redis',
      'Conhecimento em sistemas financeiros é um plus',
    ],
    skills: ['Go', 'PostgreSQL', 'Redis', 'gRPC', 'Docker', 'Kafka'],
    salaryRange: 'R$ 16.000 - R$ 24.000',
    applyUrl: 'https://pagseguro.com.br/carreiras',
  },
];

export async function seedJobs(prisma: PrismaClient, adminId: string): Promise<void> {
  console.log('\n💼 Seeding jobs...');

  const existing = await prisma.job.count();
  if (existing > 0) {
    console.log(`✅ Jobs already seeded (${existing} found)`);
    return;
  }

  for (const job of JOBS) {
    await prisma.job.create({
      data: {
        authorId: adminId,
        title: job.title,
        company: job.company,
        location: job.location,
        jobType: job.jobType as
          | 'FULL_TIME'
          | 'INTERNSHIP'
          | 'CONTRACT'
          | 'PART_TIME'
          | 'VOLUNTEER'
          | 'FREELANCE',
        description: job.description,
        requirements: job.requirements,
        skills: job.skills,
        salaryRange: job.salaryRange,
        applyUrl: job.applyUrl,
        isActive: true,
      },
    });
  }

  console.log(`✅ ${JOBS.length} jobs seeded successfully`);
}
