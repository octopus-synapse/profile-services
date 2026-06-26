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
  {
    title: 'Senior Fullstack Engineer',
    company: 'Warren',
    location: 'Remoto (Brasil)',
    jobType: 'FULL_TIME',
    description:
      'Construa a próxima geração de investimentos digitais. Buscamos fullstack seniors para squads de produto.\n\nVocê vai:\n- Desenvolver features end-to-end em React e Node.js\n- Participar de decisões arquiteturais\n- Mentorear devs mid/junior\n- Trabalhar em ambiente orientado por dados',
    requirements: [
      '5+ anos de experiência fullstack',
      'React + TypeScript',
      'Node.js (NestJS ou Express)',
      'PostgreSQL e Redis',
      'Observabilidade (Datadog, Sentry)',
    ],
    skills: ['React', 'TypeScript', 'Node.js', 'NestJS', 'PostgreSQL', 'Datadog'],
    salaryRange: 'R$ 17.000 - R$ 24.000',
    applyUrl: 'https://warren.com.br/carreiras',
  },
  {
    title: 'Flutter Developer Pleno',
    company: '99',
    location: 'Remoto (LATAM)',
    jobType: 'FULL_TIME',
    description:
      'Evolua o app de mobilidade mais usado do Brasil. Buscamos pessoas apaixonadas por mobile de alta escala.\n\nDesafios:\n- Features no app Flutter com foco em performance\n- Trabalhar com deep-links, mapas e geolocalização\n- Integração com múltiplos serviços backend',
    requirements: [
      'Flutter/Dart em produção',
      'Padrões de arquitetura (BLoC, Clean)',
      'Testes unitários e de widget',
      'Integração com APIs REST/GraphQL',
    ],
    skills: ['Flutter', 'Dart', 'BLoC', 'Firebase', 'GraphQL'],
    salaryRange: 'R$ 12.000 - R$ 18.000',
    applyUrl: 'https://99app.com/carreiras',
  },
  {
    title: 'Data Scientist',
    company: 'Neon Pagamentos',
    location: 'São Paulo, SP (Híbrido)',
    jobType: 'FULL_TIME',
    description:
      'Trabalhe com modelos de crédito e risco em uma fintech que atende milhões. Buscamos cientistas de dados para squads de credito e fraude.\n\nVocê vai:\n- Desenvolver modelos de scoring e detecção de fraude\n- Fazer análises de impacto de produto\n- Colaborar com MLOps para deploy de modelos',
    requirements: [
      'Python (scikit-learn, pandas)',
      'SQL avançado',
      'Estatística aplicada',
      'Experiência com modelos em produção',
    ],
    skills: ['Python', 'SQL', 'scikit-learn', 'pandas', 'MLflow'],
    salaryRange: 'R$ 14.000 - R$ 22.000',
    applyUrl: 'https://neon.com.br/carreiras',
  },
  {
    title: 'Tech Recruiter',
    company: 'Dextra',
    location: 'Remoto (Brasil)',
    jobType: 'FULL_TIME',
    description:
      'Encontre talentos que fazem a diferença em projetos de tecnologia de ponta. Buscamos recruiters técnicos com feeling de tech hiring.\n\nVocê vai:\n- Conduzir processos end-to-end para vagas tech\n- Fazer screening técnico em parceria com lideranças\n- Cuidar de candidate experience',
    requirements: [
      '3+ anos em tech recruiting',
      'Vivência com stacks web (React, Node, Java)',
      'Ferramentas de ATS (Gupy, Kenoby)',
      'Inglês intermediário+',
    ],
    skills: ['Tech Recruiting', 'Sourcing', 'Employer Branding'],
    salaryRange: 'R$ 7.000 - R$ 11.000',
    applyUrl: 'https://dextra.com.br/carreiras',
  },
  {
    title: 'Analista de QA Manual',
    company: 'Movile',
    location: 'Campinas, SP (Híbrido)',
    jobType: 'FULL_TIME',
    description:
      'Garanta qualidade em produtos digitais com milhões de usuários. QA manual focado em exploração e testes funcionais.\n\nResponsabilidades:\n- Escrever e executar casos de teste\n- Reportar bugs com clareza\n- Trabalhar próximo a devs em squads ágeis',
    requirements: [
      'Experiência com QA manual',
      'Entendimento de APIs (Postman)',
      'Noções de SQL',
      'Desejável: automação com Cypress',
    ],
    skills: ['QA', 'Postman', 'SQL', 'Cypress'],
    salaryRange: 'R$ 6.000 - R$ 9.000',
    applyUrl: 'https://movile.com/carreiras',
  },
  {
    title: 'Staff Engineer',
    company: 'Wildlife Studios',
    location: 'Remoto (Brasil)',
    jobType: 'FULL_TIME',
    description:
      'Lidere decisões técnicas que afetam múltiplas squads em uma das maiores empresas de mobile games do mundo.\n\nVocê vai:\n- Definir padrões técnicos em toda a engenharia\n- Mentorar seniors e tech leads\n- Participar de decisões de arquitetura de longo prazo\n- Colaborar com engenharia e produto no planejamento',
    requirements: [
      '10+ anos de experiência em engenharia',
      'Experiência comprovada em liderança técnica',
      'System design em larga escala',
      'Go, Python ou Java',
    ],
    skills: ['System Design', 'Go', 'Python', 'Kubernetes', 'AWS', 'Leadership'],
    salaryRange: 'R$ 35.000 - R$ 50.000',
    applyUrl: 'https://wildlife.studio/careers',
  },
  {
    title: 'Engineering Manager',
    company: 'Mercado Livre',
    location: 'Remoto (LATAM)',
    jobType: 'FULL_TIME',
    description:
      'Gerencie times de engenharia em um dos maiores players de e-commerce da América Latina. Foco em pessoas, processo e entrega.\n\nO que esperamos:\n- Gestão de 2 a 3 squads\n- Crescimento de carreira dos engenheiros\n- Alinhamento técnico com tech leads e staff\n- Participação em hiring',
    requirements: [
      '5+ anos como EM ou equivalente',
      'Background técnico sólido',
      'Fluência em inglês e espanhol (desejável)',
      'Experiência com squads distribuídos',
    ],
    skills: ['People Management', 'System Design', 'Agile', 'Leadership'],
    salaryRange: 'USD 6.000 - USD 10.000',
    applyUrl: 'https://careers.mercadolibre.com',
  },
  {
    title: 'Android Engineer',
    company: 'Banco Inter',
    location: 'Belo Horizonte, MG (Híbrido)',
    jobType: 'FULL_TIME',
    description:
      'Desenvolva o app Android de um dos maiores bancos digitais do Brasil. Foco em performance, modularização e UX.\n\nVocê vai:\n- Desenvolver features no app Android modular\n- Trabalhar com Jetpack Compose\n- Garantir testabilidade e observabilidade\n- Contribuir com o design system mobile',
    requirements: [
      'Kotlin avançado',
      'Jetpack Compose',
      'Arquitetura MVVM/Clean',
      'Coroutines e Flow',
      'Testes com JUnit e Espresso',
    ],
    skills: ['Kotlin', 'Jetpack Compose', 'Coroutines', 'Android', 'JUnit'],
    salaryRange: 'R$ 13.000 - R$ 20.000',
    applyUrl: 'https://inter.co/carreiras',
  },
  {
    title: 'UI/UX Designer Júnior',
    company: 'Zé Delivery',
    location: 'Remoto (Brasil)',
    jobType: 'FULL_TIME',
    description:
      'Primeira experiência em produto? Venha evoluir o app mais amado de delivery de bebidas. Mentoria constante e design system robusto.\n\nVocê vai:\n- Criar wireframes e protótipos em Figma\n- Participar de pesquisas com usuários\n- Contribuir com o design system\n- Trabalhar próximo a PMs e devs',
    requirements: [
      'Portfolio com projetos de produto',
      'Figma',
      'Noções de UX research',
      'Vontade de aprender',
    ],
    skills: ['Figma', 'UX Research', 'Prototyping', 'Design System'],
    salaryRange: 'R$ 4.500 - R$ 7.000',
    applyUrl: 'https://ze.delivery/carreiras',
  },
  {
    title: 'Observability Engineer',
    company: 'Olist',
    location: 'Curitiba, PR (Híbrido)',
    jobType: 'FULL_TIME',
    description:
      'Construa a plataforma de observabilidade de uma das maiores suites de e-commerce do Brasil. Se você curte tooling interno, essa vaga é pra você.\n\nDesafios:\n- Evoluir a stack de logs, métricas e traces\n- Definir SLOs em parceria com squads\n- Automatizar alertas e runbooks',
    requirements: [
      'Experiência com Prometheus, Grafana, OpenTelemetry',
      'ElasticSearch ou equivalente',
      'Infra-as-code (Terraform)',
      'Python ou Go',
    ],
    skills: ['Prometheus', 'Grafana', 'OpenTelemetry', 'Terraform', 'Go'],
    salaryRange: 'R$ 15.000 - R$ 22.000',
    applyUrl: 'https://olist.com/carreiras',
  },
  {
    title: 'Estágio em Data Analytics',
    company: 'B3',
    location: 'São Paulo, SP (Presencial)',
    jobType: 'INTERNSHIP',
    description:
      'Inicie sua carreira em dados no maior player de infraestrutura de mercado financeiro da América Latina. Programa estruturado com projetos reais.\n\nO que você vai aprender:\n- SQL e modelagem dimensional\n- Visualização com Power BI ou Tableau\n- Fundamentos de mercado financeiro',
    requirements: [
      'Cursando Engenharia, Economia, Estatística ou afins',
      'Noções de SQL',
      'Excel avançado',
      'Inglês intermediário',
    ],
    skills: ['SQL', 'Excel', 'Power BI', 'Python'],
    salaryRange: 'R$ 2.800 - R$ 3.800',
    applyUrl: 'https://b3.com.br/carreiras',
  },
  {
    title: 'Developer Advocate',
    company: 'DigitalOcean Brasil',
    location: 'Remoto (Brasil)',
    jobType: 'FULL_TIME',
    description:
      'Conecte-se com a comunidade dev brasileira produzindo conteúdo técnico, workshops e eventos. Parte técnica, parte comunidade.\n\nVocê vai:\n- Escrever artigos e docs técnicas\n- Falar em eventos e meetups\n- Representar a voz da comunidade para o produto\n- Criar conteúdo em vídeo e live',
    requirements: [
      'Background técnico (web, devops, cloud)',
      'Experiência criando conteúdo',
      'Comunicação oral e escrita',
      'Inglês fluente',
    ],
    skills: ['Content Creation', 'Kubernetes', 'Cloud', 'Public Speaking'],
    salaryRange: 'USD 5.000 - USD 8.000',
    applyUrl: 'https://digitalocean.com/careers',
  },
  {
    title: 'Engenheiro(a) de Dados Pleno',
    company: 'QuintoAndar',
    location: 'Remoto (Brasil)',
    jobType: 'FULL_TIME',
    description:
      'Construa pipelines de dados que viabilizam decisões de produto em uma das maiores proptechs da América Latina.\n\nDesafios:\n- Pipelines em Airflow e dbt\n- Data lake no S3 + Databricks\n- Qualidade de dados (Great Expectations)\n- Parceria com squads de produto',
    requirements: [
      'Python e SQL avançados',
      'Airflow, dbt ou equivalente',
      'Spark ou Databricks',
      'AWS (S3, Glue, Athena)',
    ],
    skills: ['Python', 'SQL', 'Airflow', 'dbt', 'Spark', 'AWS'],
    salaryRange: 'R$ 14.000 - R$ 21.000',
    applyUrl: 'https://quintoandar.com.br/carreiras',
  },
  {
    title: 'Product Manager Sr',
    company: 'Dasa',
    location: 'São Paulo, SP (Híbrido)',
    jobType: 'FULL_TIME',
    description:
      'Lidere produtos de saúde digital em um dos maiores grupos de medicina diagnóstica do Brasil. Combine discovery rigoroso com entrega contínua.\n\nO que esperamos:\n- Ownership de 1-2 produtos end-to-end\n- Discovery contínuo com pacientes e médicos\n- Roadmap orientado por métricas\n- Colaboração com engenharia, design, compliance',
    requirements: [
      '5+ anos como PM',
      'Experiência em produtos regulados (desejável)',
      'Analytics (SQL, Amplitude)',
      'Storytelling com stakeholders C-level',
    ],
    skills: ['Product Strategy', 'Analytics', 'SQL', 'Amplitude', 'Stakeholder Management'],
    salaryRange: 'R$ 20.000 - R$ 28.000',
    applyUrl: 'https://dasa.com.br/carreiras',
  },
  {
    title: 'iOS Developer (Contract)',
    company: 'Sympla',
    location: 'Remoto (Brasil)',
    jobType: 'CONTRACT',
    description:
      'Contrato de 6 meses para evoluir o app iOS da maior plataforma de eventos do Brasil. Possibilidade de efetivação ao fim do projeto.\n\nVocê vai:\n- Implementar novas features no app iOS\n- Participar de reviews técnicos\n- Trabalhar com equipes remotas distribuídas',
    requirements: [
      'Swift avançado',
      'SwiftUI',
      'Combine ou async/await',
      'Testes XCTest',
      'Publicação em App Store',
    ],
    skills: ['Swift', 'SwiftUI', 'Combine', 'iOS', 'XCTest'],
    salaryRange: 'R$ 15.000 - R$ 22.000',
    applyUrl: 'https://sympla.com.br/carreiras',
  },
];

export async function seedJobs(prisma: PrismaClient, adminId: string): Promise<void> {
  console.log('\n💼 Seeding jobs...');

  const existingJobs = await prisma.job.findMany({ select: { title: true, company: true } });
  const existingKeys = new Set(existingJobs.map((j) => `${j.title}::${j.company}`));

  let created = 0;
  for (const job of JOBS) {
    if (existingKeys.has(`${job.title}::${job.company}`)) continue;

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
    created++;
  }

  if (created === 0) {
    console.log(`✅ Jobs already seeded (${existingJobs.length} found, ${JOBS.length} in catalog)`);
  } else {
    console.log(`✅ ${created} new jobs seeded (total: ${existingJobs.length + created})`);
  }
}
