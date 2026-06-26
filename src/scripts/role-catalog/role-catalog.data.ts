// lint-allow-file-size: intrinsic flat data catalog — one entry per curated
// occupation; size is the data, not structure, and splitting it would only
// fragment a single source of truth consumed by the variant generator.
/**
 * Curated base catalog of occupations spanning every major area, each with
 * the two PT grammatical forms (agent + area) the variant generator needs
 * (see generate-role-variants.ts). Imported occupational taxonomies don't
 * model seniority, so this catalog is the source for "Estagiário/Júnior/
 * Pleno/Sênior/Trainee" and the English equivalents.
 *
 * Extend freely — adding an entry yields ~13 PT/EN variant rows on the next
 * `bun run roles:import --source=curated`. Keep PT forms grammatical:
 *   - agent  = agentive noun, takes the "… Júnior/Pleno/Sênior" suffix
 *   - area   = activity noun, takes the "Estagiário de …" / "Trainee de …" prefix
 * Provide `agentF` only when the noun's feminine differs from `agent`.
 */

import type { RoleCatalogEntry } from './generate-role-variants';

export const ROLE_CATALOG: readonly RoleCatalogEntry[] = [
  // ── Software / Tech ──────────────────────────────────────────────
  {
    key: 'software-development',
    area: 'tech',
    en: { role: 'Software Developer' },
    pt: {
      agent: 'Desenvolvedor de Software',
      agentF: 'Desenvolvedora de Software',
      area: 'Desenvolvimento de Software',
    },
  },
  {
    key: 'software-engineering',
    area: 'tech',
    en: { role: 'Software Engineer' },
    pt: {
      agent: 'Engenheiro de Software',
      agentF: 'Engenheira de Software',
      area: 'Engenharia de Software',
    },
  },
  {
    key: 'systems-development',
    area: 'tech',
    en: { role: 'Systems Developer' },
    pt: {
      agent: 'Desenvolvedor de Sistemas',
      agentF: 'Desenvolvedora de Sistemas',
      area: 'Desenvolvimento de Sistemas',
    },
  },
  {
    key: 'frontend-development',
    area: 'tech',
    en: { role: 'Front-end Developer' },
    pt: {
      agent: 'Desenvolvedor Front-end',
      agentF: 'Desenvolvedora Front-end',
      area: 'Desenvolvimento Front-end',
    },
  },
  {
    key: 'backend-development',
    area: 'tech',
    en: { role: 'Back-end Developer' },
    pt: {
      agent: 'Desenvolvedor Back-end',
      agentF: 'Desenvolvedora Back-end',
      area: 'Desenvolvimento Back-end',
    },
  },
  {
    key: 'fullstack-development',
    area: 'tech',
    en: { role: 'Full-stack Developer' },
    pt: {
      agent: 'Desenvolvedor Full-stack',
      agentF: 'Desenvolvedora Full-stack',
      area: 'Desenvolvimento Full-stack',
    },
  },
  {
    key: 'mobile-development',
    area: 'tech',
    en: { role: 'Mobile Developer' },
    pt: {
      agent: 'Desenvolvedor Mobile',
      agentF: 'Desenvolvedora Mobile',
      area: 'Desenvolvimento Mobile',
    },
  },
  {
    key: 'web-development',
    area: 'tech',
    en: { role: 'Web Developer' },
    pt: { agent: 'Desenvolvedor Web', agentF: 'Desenvolvedora Web', area: 'Desenvolvimento Web' },
  },
  {
    key: 'game-development',
    area: 'tech',
    en: { role: 'Game Developer' },
    pt: {
      agent: 'Desenvolvedor de Jogos',
      agentF: 'Desenvolvedora de Jogos',
      area: 'Desenvolvimento de Jogos',
    },
  },
  {
    key: 'qa-engineering',
    area: 'tech',
    en: { role: 'QA Engineer' },
    pt: {
      agent: 'Engenheiro de QA',
      agentF: 'Engenheira de QA',
      area: 'Garantia de Qualidade de Software',
    },
  },
  {
    key: 'devops-engineering',
    area: 'tech',
    en: { role: 'DevOps Engineer' },
    pt: { agent: 'Engenheiro DevOps', agentF: 'Engenheira DevOps', area: 'DevOps' },
  },
  {
    key: 'site-reliability',
    area: 'tech',
    en: { role: 'Site Reliability Engineer' },
    pt: {
      agent: 'Engenheiro de Confiabilidade',
      agentF: 'Engenheira de Confiabilidade',
      area: 'Confiabilidade de Sistemas',
    },
  },
  {
    key: 'data-engineering',
    area: 'tech',
    en: { role: 'Data Engineer' },
    pt: {
      agent: 'Engenheiro de Dados',
      agentF: 'Engenheira de Dados',
      area: 'Engenharia de Dados',
    },
  },
  {
    key: 'data-science',
    area: 'tech',
    en: { role: 'Data Scientist' },
    pt: { agent: 'Cientista de Dados', area: 'Ciência de Dados' },
  },
  {
    key: 'data-analysis',
    area: 'tech',
    en: { role: 'Data Analyst' },
    pt: { agent: 'Analista de Dados', area: 'Análise de Dados' },
  },
  {
    key: 'machine-learning',
    area: 'tech',
    en: { role: 'Machine Learning Engineer' },
    pt: {
      agent: 'Engenheiro de Machine Learning',
      agentF: 'Engenheira de Machine Learning',
      area: 'Machine Learning',
    },
  },
  {
    key: 'ai-engineering',
    area: 'tech',
    en: { role: 'AI Engineer' },
    pt: { agent: 'Engenheiro de IA', agentF: 'Engenheira de IA', area: 'Inteligência Artificial' },
  },
  {
    key: 'cloud-engineering',
    area: 'tech',
    en: { role: 'Cloud Engineer' },
    pt: {
      agent: 'Engenheiro de Cloud',
      agentF: 'Engenheira de Cloud',
      area: 'Computação em Nuvem',
    },
  },
  {
    key: 'security-engineering',
    area: 'tech',
    en: { role: 'Security Engineer' },
    pt: {
      agent: 'Engenheiro de Segurança',
      agentF: 'Engenheira de Segurança',
      area: 'Segurança da Informação',
    },
  },
  {
    key: 'cybersecurity-analysis',
    area: 'tech',
    en: { role: 'Cybersecurity Analyst' },
    pt: { agent: 'Analista de Segurança da Informação', area: 'Segurança Cibernética' },
  },
  {
    key: 'database-administration',
    area: 'tech',
    en: { role: 'Database Administrator' },
    pt: {
      agent: 'Administrador de Banco de Dados',
      agentF: 'Administradora de Banco de Dados',
      area: 'Administração de Banco de Dados',
    },
  },
  {
    key: 'systems-administration',
    area: 'tech',
    en: { role: 'Systems Administrator' },
    pt: {
      agent: 'Administrador de Sistemas',
      agentF: 'Administradora de Sistemas',
      area: 'Administração de Sistemas',
    },
  },
  {
    key: 'network-engineering',
    area: 'tech',
    en: { role: 'Network Engineer' },
    pt: {
      agent: 'Engenheiro de Redes',
      agentF: 'Engenheira de Redes',
      area: 'Redes de Computadores',
    },
  },
  {
    key: 'it-support',
    area: 'tech',
    en: { role: 'IT Support Analyst' },
    pt: { agent: 'Analista de Suporte de TI', area: 'Suporte de TI' },
  },
  {
    key: 'infrastructure-analysis',
    area: 'tech',
    en: { role: 'Infrastructure Analyst' },
    pt: { agent: 'Analista de Infraestrutura', area: 'Infraestrutura de TI' },
  },
  {
    key: 'solutions-architecture',
    area: 'tech',
    en: { role: 'Solutions Architect' },
    pt: {
      agent: 'Arquiteto de Soluções',
      agentF: 'Arquiteta de Soluções',
      area: 'Arquitetura de Soluções',
    },
  },
  {
    key: 'ux-design',
    area: 'tech',
    en: { role: 'UX Designer' },
    pt: { agent: 'Designer de UX', area: 'Design de UX' },
  },
  {
    key: 'ui-design',
    area: 'tech',
    en: { role: 'UI Designer' },
    pt: { agent: 'Designer de UI', area: 'Design de UI' },
  },
  {
    key: 'product-design',
    area: 'tech',
    en: { role: 'Product Designer' },
    pt: { agent: 'Designer de Produto', area: 'Design de Produto' },
  },
  {
    key: 'product-management',
    area: 'tech',
    en: { role: 'Product Manager' },
    pt: { agent: 'Gerente de Produto', area: 'Gestão de Produto' },
  },
  {
    key: 'project-management',
    area: 'tech',
    en: { role: 'Project Manager' },
    pt: { agent: 'Gerente de Projetos', area: 'Gestão de Projetos' },
  },
  {
    key: 'business-analysis',
    area: 'tech',
    en: { role: 'Business Analyst' },
    pt: { agent: 'Analista de Negócios', area: 'Análise de Negócios' },
  },
  {
    key: 'systems-analysis',
    area: 'tech',
    en: { role: 'Systems Analyst' },
    pt: { agent: 'Analista de Sistemas', area: 'Análise de Sistemas' },
  },
  {
    key: 'business-intelligence',
    area: 'tech',
    en: { role: 'BI Analyst' },
    pt: { agent: 'Analista de BI', area: 'Business Intelligence' },
  },

  // ── Engineering (non-software) ───────────────────────────────────
  {
    key: 'civil-engineering',
    area: 'engineering',
    en: { role: 'Civil Engineer' },
    pt: { agent: 'Engenheiro Civil', agentF: 'Engenheira Civil', area: 'Engenharia Civil' },
  },
  {
    key: 'mechanical-engineering',
    area: 'engineering',
    en: { role: 'Mechanical Engineer' },
    pt: {
      agent: 'Engenheiro Mecânico',
      agentF: 'Engenheira Mecânica',
      area: 'Engenharia Mecânica',
    },
  },
  {
    key: 'electrical-engineering',
    area: 'engineering',
    en: { role: 'Electrical Engineer' },
    pt: {
      agent: 'Engenheiro Eletricista',
      agentF: 'Engenheira Eletricista',
      area: 'Engenharia Elétrica',
    },
  },
  {
    key: 'electronic-engineering',
    area: 'engineering',
    en: { role: 'Electronics Engineer' },
    pt: {
      agent: 'Engenheiro Eletrônico',
      agentF: 'Engenheira Eletrônica',
      area: 'Engenharia Eletrônica',
    },
  },
  {
    key: 'production-engineering',
    area: 'engineering',
    en: { role: 'Production Engineer' },
    pt: {
      agent: 'Engenheiro de Produção',
      agentF: 'Engenheira de Produção',
      area: 'Engenharia de Produção',
    },
  },
  {
    key: 'chemical-engineering',
    area: 'engineering',
    en: { role: 'Chemical Engineer' },
    pt: { agent: 'Engenheiro Químico', agentF: 'Engenheira Química', area: 'Engenharia Química' },
  },
  {
    key: 'environmental-engineering',
    area: 'engineering',
    en: { role: 'Environmental Engineer' },
    pt: {
      agent: 'Engenheiro Ambiental',
      agentF: 'Engenheira Ambiental',
      area: 'Engenharia Ambiental',
    },
  },
  {
    key: 'industrial-engineering',
    area: 'engineering',
    en: { role: 'Industrial Engineer' },
    pt: {
      agent: 'Engenheiro Industrial',
      agentF: 'Engenheira Industrial',
      area: 'Engenharia Industrial',
    },
  },
  {
    key: 'mechatronics-engineering',
    area: 'engineering',
    en: { role: 'Mechatronics Engineer' },
    pt: {
      agent: 'Engenheiro Mecatrônico',
      agentF: 'Engenheira Mecatrônica',
      area: 'Engenharia Mecatrônica',
    },
  },
  {
    key: 'petroleum-engineering',
    area: 'engineering',
    en: { role: 'Petroleum Engineer' },
    pt: {
      agent: 'Engenheiro de Petróleo',
      agentF: 'Engenheira de Petróleo',
      area: 'Engenharia de Petróleo',
    },
  },
  {
    key: 'biomedical-engineering',
    area: 'engineering',
    en: { role: 'Biomedical Engineer' },
    pt: {
      agent: 'Engenheiro Biomédico',
      agentF: 'Engenheira Biomédica',
      area: 'Engenharia Biomédica',
    },
  },
  {
    key: 'food-engineering',
    area: 'engineering',
    en: { role: 'Food Engineer' },
    pt: {
      agent: 'Engenheiro de Alimentos',
      agentF: 'Engenheira de Alimentos',
      area: 'Engenharia de Alimentos',
    },
  },
  {
    key: 'safety-engineering',
    area: 'engineering',
    en: { role: 'Safety Engineer' },
    pt: {
      agent: 'Engenheiro de Segurança do Trabalho',
      agentF: 'Engenheira de Segurança do Trabalho',
      area: 'Segurança do Trabalho',
    },
  },
  {
    key: 'forestry-engineering',
    area: 'engineering',
    en: { role: 'Forestry Engineer' },
    pt: {
      agent: 'Engenheiro Florestal',
      agentF: 'Engenheira Florestal',
      area: 'Engenharia Florestal',
    },
  },

  // ── Health ───────────────────────────────────────────────────────
  {
    key: 'medicine',
    area: 'health',
    en: { role: 'Physician' },
    pt: { agent: 'Médico', agentF: 'Médica', area: 'Medicina' },
  },
  {
    key: 'nursing',
    area: 'health',
    en: { role: 'Nurse' },
    pt: { agent: 'Enfermeiro', agentF: 'Enfermeira', area: 'Enfermagem' },
  },
  {
    key: 'nursing-tech',
    area: 'health',
    en: { role: 'Nursing Technician' },
    pt: {
      agent: 'Técnico de Enfermagem',
      agentF: 'Técnica de Enfermagem',
      area: 'Técnico de Enfermagem',
    },
  },
  {
    key: 'dentistry',
    area: 'health',
    en: { role: 'Dentist' },
    pt: { agent: 'Dentista', area: 'Odontologia' },
  },
  {
    key: 'physiotherapy',
    area: 'health',
    en: { role: 'Physiotherapist' },
    pt: { agent: 'Fisioterapeuta', area: 'Fisioterapia' },
  },
  {
    key: 'psychology',
    area: 'health',
    en: { role: 'Psychologist' },
    pt: { agent: 'Psicólogo', agentF: 'Psicóloga', area: 'Psicologia' },
  },
  {
    key: 'nutrition',
    area: 'health',
    en: { role: 'Nutritionist' },
    pt: { agent: 'Nutricionista', area: 'Nutrição' },
  },
  {
    key: 'pharmacy',
    area: 'health',
    en: { role: 'Pharmacist' },
    pt: { agent: 'Farmacêutico', agentF: 'Farmacêutica', area: 'Farmácia' },
  },
  {
    key: 'veterinary',
    area: 'health',
    en: { role: 'Veterinarian' },
    pt: { agent: 'Veterinário', agentF: 'Veterinária', area: 'Medicina Veterinária' },
  },
  {
    key: 'biomedicine',
    area: 'health',
    en: { role: 'Biomedical Scientist' },
    pt: { agent: 'Biomédico', agentF: 'Biomédica', area: 'Biomedicina' },
  },
  {
    key: 'speech-therapy',
    area: 'health',
    en: { role: 'Speech Therapist' },
    pt: { agent: 'Fonoaudiólogo', agentF: 'Fonoaudióloga', area: 'Fonoaudiologia' },
  },
  {
    key: 'occupational-therapy',
    area: 'health',
    en: { role: 'Occupational Therapist' },
    pt: { agent: 'Terapeuta Ocupacional', area: 'Terapia Ocupacional' },
  },
  {
    key: 'radiology-tech',
    area: 'health',
    en: { role: 'Radiology Technician' },
    pt: { agent: 'Técnico em Radiologia', agentF: 'Técnica em Radiologia', area: 'Radiologia' },
  },

  // ── Law / Legal ──────────────────────────────────────────────────
  {
    key: 'law',
    area: 'legal',
    en: { role: 'Lawyer' },
    pt: { agent: 'Advogado', agentF: 'Advogada', area: 'Direito' },
  },
  {
    key: 'legal-counsel',
    area: 'legal',
    en: { role: 'Legal Counsel' },
    pt: {
      agent: 'Consultor Jurídico',
      agentF: 'Consultora Jurídica',
      area: 'Consultoria Jurídica',
    },
  },
  {
    key: 'paralegal',
    area: 'legal',
    en: { role: 'Paralegal' },
    pt: { agent: 'Assistente Jurídico', agentF: 'Assistente Jurídica', area: 'Apoio Jurídico' },
  },
  {
    key: 'compliance',
    area: 'legal',
    en: { role: 'Compliance Analyst' },
    pt: { agent: 'Analista de Compliance', area: 'Compliance' },
  },

  // ── Finance / Accounting ─────────────────────────────────────────
  {
    key: 'accounting',
    area: 'finance',
    en: { role: 'Accountant' },
    pt: { agent: 'Contador', agentF: 'Contadora', area: 'Contabilidade' },
  },
  {
    key: 'financial-analysis',
    area: 'finance',
    en: { role: 'Financial Analyst' },
    pt: { agent: 'Analista Financeiro', agentF: 'Analista Financeira', area: 'Análise Financeira' },
  },
  {
    key: 'controllership',
    area: 'finance',
    en: { role: 'Controller' },
    pt: { agent: 'Controller', area: 'Controladoria' },
  },
  {
    key: 'auditing',
    area: 'finance',
    en: { role: 'Auditor' },
    pt: { agent: 'Auditor', agentF: 'Auditora', area: 'Auditoria' },
  },
  {
    key: 'investment-analysis',
    area: 'finance',
    en: { role: 'Investment Analyst' },
    pt: { agent: 'Analista de Investimentos', area: 'Análise de Investimentos' },
  },
  {
    key: 'financial-planning',
    area: 'finance',
    en: { role: 'Financial Planner' },
    pt: {
      agent: 'Planejador Financeiro',
      agentF: 'Planejadora Financeira',
      area: 'Planejamento Financeiro',
    },
  },
  {
    key: 'treasury',
    area: 'finance',
    en: { role: 'Treasury Analyst' },
    pt: { agent: 'Analista de Tesouraria', area: 'Tesouraria' },
  },
  {
    key: 'tax-analysis',
    area: 'finance',
    en: { role: 'Tax Analyst' },
    pt: { agent: 'Analista Fiscal', area: 'Área Fiscal' },
  },
  {
    key: 'accounts-payable',
    area: 'finance',
    en: { role: 'Accounts Payable Analyst' },
    pt: { agent: 'Analista de Contas a Pagar', area: 'Contas a Pagar' },
  },
  {
    key: 'credit-analysis',
    area: 'finance',
    en: { role: 'Credit Analyst' },
    pt: { agent: 'Analista de Crédito', area: 'Análise de Crédito' },
  },
  {
    key: 'actuarial',
    area: 'finance',
    en: { role: 'Actuary' },
    pt: { agent: 'Atuário', agentF: 'Atuária', area: 'Ciências Atuariais' },
  },
  {
    key: 'insurance',
    area: 'finance',
    en: { role: 'Insurance Analyst' },
    pt: { agent: 'Analista de Seguros', area: 'Seguros' },
  },

  // ── Marketing / Communications ───────────────────────────────────
  {
    key: 'marketing',
    area: 'marketing',
    en: { role: 'Marketing Analyst' },
    pt: { agent: 'Analista de Marketing', area: 'Marketing' },
  },
  {
    key: 'digital-marketing',
    area: 'marketing',
    en: { role: 'Digital Marketing Analyst' },
    pt: { agent: 'Analista de Marketing Digital', area: 'Marketing Digital' },
  },
  {
    key: 'content-marketing',
    area: 'marketing',
    en: { role: 'Content Analyst' },
    pt: { agent: 'Analista de Conteúdo', area: 'Marketing de Conteúdo' },
  },
  {
    key: 'social-media',
    area: 'marketing',
    en: { role: 'Social Media Analyst' },
    pt: { agent: 'Analista de Mídias Sociais', area: 'Mídias Sociais' },
  },
  {
    key: 'seo',
    area: 'marketing',
    en: { role: 'SEO Analyst' },
    pt: { agent: 'Analista de SEO', area: 'SEO' },
  },
  {
    key: 'performance-marketing',
    area: 'marketing',
    en: { role: 'Performance Analyst' },
    pt: { agent: 'Analista de Performance', area: 'Marketing de Performance' },
  },
  {
    key: 'branding',
    area: 'marketing',
    en: { role: 'Brand Analyst' },
    pt: { agent: 'Analista de Branding', area: 'Branding' },
  },
  {
    key: 'public-relations',
    area: 'marketing',
    en: { role: 'Public Relations Analyst' },
    pt: { agent: 'Analista de Relações Públicas', area: 'Relações Públicas' },
  },
  {
    key: 'communications',
    area: 'marketing',
    en: { role: 'Communications Analyst' },
    pt: { agent: 'Analista de Comunicação', area: 'Comunicação' },
  },
  {
    key: 'growth',
    area: 'marketing',
    en: { role: 'Growth Analyst' },
    pt: { agent: 'Analista de Growth', area: 'Growth' },
  },
  {
    key: 'copywriting',
    area: 'marketing',
    en: { role: 'Copywriter' },
    pt: { agent: 'Redator', agentF: 'Redatora', area: 'Redação Publicitária' },
  },
  {
    key: 'journalism',
    area: 'marketing',
    en: { role: 'Journalist' },
    pt: { agent: 'Jornalista', area: 'Jornalismo' },
  },
  {
    key: 'advertising',
    area: 'marketing',
    en: { role: 'Advertising Analyst' },
    pt: { agent: 'Analista de Publicidade', area: 'Publicidade' },
  },

  // ── Sales / Commercial ───────────────────────────────────────────
  {
    key: 'sales',
    area: 'sales',
    en: { role: 'Sales Analyst' },
    pt: { agent: 'Analista de Vendas', area: 'Vendas' },
  },
  {
    key: 'sales-rep',
    area: 'sales',
    en: { role: 'Sales Representative' },
    pt: { agent: 'Representante de Vendas', area: 'Representação Comercial' },
  },
  {
    key: 'account-management',
    area: 'sales',
    en: { role: 'Account Manager' },
    pt: { agent: 'Gerente de Contas', area: 'Gestão de Contas' },
  },
  {
    key: 'business-development',
    area: 'sales',
    en: { role: 'Business Development Analyst' },
    pt: { agent: 'Analista de Desenvolvimento de Negócios', area: 'Desenvolvimento de Negócios' },
  },
  {
    key: 'customer-success',
    area: 'sales',
    en: { role: 'Customer Success Analyst' },
    pt: { agent: 'Analista de Sucesso do Cliente', area: 'Sucesso do Cliente' },
  },
  {
    key: 'inside-sales',
    area: 'sales',
    en: { role: 'Inside Sales Analyst' },
    pt: { agent: 'Analista de Inside Sales', area: 'Inside Sales' },
  },
  {
    key: 'retail-sales',
    area: 'sales',
    en: { role: 'Retail Salesperson' },
    pt: { agent: 'Vendedor', agentF: 'Vendedora', area: 'Vendas no Varejo' },
  },
  {
    key: 'commercial',
    area: 'sales',
    en: { role: 'Commercial Analyst' },
    pt: { agent: 'Analista Comercial', area: 'Área Comercial' },
  },

  // ── Customer / Support ───────────────────────────────────────────
  {
    key: 'customer-support',
    area: 'support',
    en: { role: 'Customer Support Analyst' },
    pt: { agent: 'Analista de Suporte ao Cliente', area: 'Suporte ao Cliente' },
  },
  {
    key: 'customer-service',
    area: 'support',
    en: { role: 'Customer Service Representative' },
    pt: { agent: 'Atendente', area: 'Atendimento ao Cliente' },
  },
  {
    key: 'call-center',
    area: 'support',
    en: { role: 'Call Center Operator' },
    pt: {
      agent: 'Operador de Telemarketing',
      agentF: 'Operadora de Telemarketing',
      area: 'Telemarketing',
    },
  },

  // ── HR / People ──────────────────────────────────────────────────
  {
    key: 'human-resources',
    area: 'hr',
    en: { role: 'HR Analyst' },
    pt: { agent: 'Analista de Recursos Humanos', area: 'Recursos Humanos' },
  },
  {
    key: 'recruitment',
    area: 'hr',
    en: { role: 'Recruiter' },
    pt: { agent: 'Recrutador', agentF: 'Recrutadora', area: 'Recrutamento e Seleção' },
  },
  {
    key: 'talent-acquisition',
    area: 'hr',
    en: { role: 'Talent Acquisition Analyst' },
    pt: { agent: 'Analista de Aquisição de Talentos', area: 'Aquisição de Talentos' },
  },
  {
    key: 'people-management',
    area: 'hr',
    en: { role: 'People Manager' },
    pt: { agent: 'Gerente de Pessoas', area: 'Gestão de Pessoas' },
  },
  {
    key: 'payroll',
    area: 'hr',
    en: { role: 'Payroll Analyst' },
    pt: { agent: 'Analista de Folha de Pagamento', area: 'Departamento Pessoal' },
  },
  {
    key: 'training-development',
    area: 'hr',
    en: { role: 'Training Analyst' },
    pt: {
      agent: 'Analista de Treinamento e Desenvolvimento',
      area: 'Treinamento e Desenvolvimento',
    },
  },

  // ── Design / Creative ────────────────────────────────────────────
  {
    key: 'graphic-design',
    area: 'design',
    en: { role: 'Graphic Designer' },
    pt: { agent: 'Designer Gráfico', area: 'Design Gráfico' },
  },
  {
    key: 'motion-design',
    area: 'design',
    en: { role: 'Motion Designer' },
    pt: { agent: 'Motion Designer', area: 'Motion Design' },
  },
  {
    key: 'industrial-design',
    area: 'design',
    en: { role: 'Industrial Designer' },
    pt: { agent: 'Designer Industrial', area: 'Design Industrial' },
  },
  {
    key: 'interior-design',
    area: 'design',
    en: { role: 'Interior Designer' },
    pt: { agent: 'Designer de Interiores', area: 'Design de Interiores' },
  },
  {
    key: 'fashion-design',
    area: 'design',
    en: { role: 'Fashion Designer' },
    pt: { agent: 'Estilista', area: 'Design de Moda' },
  },
  {
    key: 'illustration',
    area: 'design',
    en: { role: 'Illustrator' },
    pt: { agent: 'Ilustrador', agentF: 'Ilustradora', area: 'Ilustração' },
  },
  {
    key: 'video-editing',
    area: 'design',
    en: { role: 'Video Editor' },
    pt: { agent: 'Editor de Vídeo', agentF: 'Editora de Vídeo', area: 'Edição de Vídeo' },
  },
  {
    key: 'photography',
    area: 'design',
    en: { role: 'Photographer' },
    pt: { agent: 'Fotógrafo', agentF: 'Fotógrafa', area: 'Fotografia' },
  },
  {
    key: 'art-direction',
    area: 'design',
    en: { role: 'Art Director' },
    pt: { agent: 'Diretor de Arte', agentF: 'Diretora de Arte', area: 'Direção de Arte' },
  },

  // ── Education ────────────────────────────────────────────────────
  {
    key: 'teaching',
    area: 'education',
    en: { role: 'Teacher' },
    pt: { agent: 'Professor', agentF: 'Professora', area: 'Docência' },
  },
  {
    key: 'pedagogy',
    area: 'education',
    en: { role: 'Pedagogue' },
    pt: { agent: 'Pedagogo', agentF: 'Pedagoga', area: 'Pedagogia' },
  },
  {
    key: 'educational-coordination',
    area: 'education',
    en: { role: 'Educational Coordinator' },
    pt: {
      agent: 'Coordenador Pedagógico',
      agentF: 'Coordenadora Pedagógica',
      area: 'Coordenação Pedagógica',
    },
  },
  {
    key: 'tutoring',
    area: 'education',
    en: { role: 'Tutor' },
    pt: { agent: 'Tutor', agentF: 'Tutora', area: 'Tutoria' },
  },
  {
    key: 'translation',
    area: 'education',
    en: { role: 'Translator' },
    pt: { agent: 'Tradutor', agentF: 'Tradutora', area: 'Tradução' },
  },

  // ── Admin / Operations / Logistics ───────────────────────────────
  {
    key: 'administration',
    area: 'operations',
    en: { role: 'Administrative Analyst' },
    pt: {
      agent: 'Analista Administrativo',
      agentF: 'Analista Administrativa',
      area: 'Administração',
    },
  },
  {
    key: 'administrative-assistant',
    area: 'operations',
    en: { role: 'Administrative Assistant' },
    pt: {
      agent: 'Assistente Administrativo',
      agentF: 'Assistente Administrativa',
      area: 'Apoio Administrativo',
    },
  },
  {
    key: 'operations',
    area: 'operations',
    en: { role: 'Operations Analyst' },
    pt: { agent: 'Analista de Operações', area: 'Operações' },
  },
  {
    key: 'logistics',
    area: 'operations',
    en: { role: 'Logistics Analyst' },
    pt: { agent: 'Analista de Logística', area: 'Logística' },
  },
  {
    key: 'supply-chain',
    area: 'operations',
    en: { role: 'Supply Chain Analyst' },
    pt: { agent: 'Analista de Supply Chain', area: 'Supply Chain' },
  },
  {
    key: 'procurement',
    area: 'operations',
    en: { role: 'Procurement Analyst' },
    pt: { agent: 'Analista de Compras', area: 'Compras' },
  },
  {
    key: 'inventory',
    area: 'operations',
    en: { role: 'Inventory Analyst' },
    pt: { agent: 'Analista de Estoque', area: 'Controle de Estoque' },
  },
  {
    key: 'foreign-trade',
    area: 'operations',
    en: { role: 'Foreign Trade Analyst' },
    pt: { agent: 'Analista de Comércio Exterior', area: 'Comércio Exterior' },
  },
  {
    key: 'planning',
    area: 'operations',
    en: { role: 'Planning Analyst' },
    pt: { agent: 'Analista de Planejamento', area: 'Planejamento' },
  },
  {
    key: 'process-analysis',
    area: 'operations',
    en: { role: 'Process Analyst' },
    pt: { agent: 'Analista de Processos', area: 'Processos' },
  },
  {
    key: 'project-coordination',
    area: 'operations',
    en: { role: 'Project Coordinator' },
    pt: {
      agent: 'Coordenador de Projetos',
      agentF: 'Coordenadora de Projetos',
      area: 'Coordenação de Projetos',
    },
  },
  {
    key: 'secretariat',
    area: 'operations',
    en: { role: 'Secretary' },
    pt: { agent: 'Secretário', agentF: 'Secretária', area: 'Secretariado' },
  },
  {
    key: 'reception',
    area: 'operations',
    en: { role: 'Receptionist' },
    pt: { agent: 'Recepcionista', area: 'Recepção' },
  },

  // ── Science / Research ───────────────────────────────────────────
  {
    key: 'research',
    area: 'science',
    en: { role: 'Researcher' },
    pt: { agent: 'Pesquisador', agentF: 'Pesquisadora', area: 'Pesquisa' },
  },
  {
    key: 'biology',
    area: 'science',
    en: { role: 'Biologist' },
    pt: { agent: 'Biólogo', agentF: 'Bióloga', area: 'Biologia' },
  },
  {
    key: 'chemistry',
    area: 'science',
    en: { role: 'Chemist' },
    pt: { agent: 'Químico', agentF: 'Química', area: 'Química' },
  },
  {
    key: 'physics',
    area: 'science',
    en: { role: 'Physicist' },
    pt: { agent: 'Físico', agentF: 'Física', area: 'Física' },
  },
  {
    key: 'statistics',
    area: 'science',
    en: { role: 'Statistician' },
    pt: { agent: 'Estatístico', agentF: 'Estatística', area: 'Estatística' },
  },
  {
    key: 'economics',
    area: 'science',
    en: { role: 'Economist' },
    pt: { agent: 'Economista', area: 'Economia' },
  },
  {
    key: 'laboratory',
    area: 'science',
    en: { role: 'Lab Technician' },
    pt: {
      agent: 'Técnico de Laboratório',
      agentF: 'Técnica de Laboratório',
      area: 'Análises Laboratoriais',
    },
  },

  // ── Architecture / Construction ──────────────────────────────────
  {
    key: 'architecture',
    area: 'construction',
    en: { role: 'Architect' },
    pt: { agent: 'Arquiteto', agentF: 'Arquiteta', area: 'Arquitetura' },
  },
  {
    key: 'urban-planning',
    area: 'construction',
    en: { role: 'Urban Planner' },
    pt: { agent: 'Urbanista', area: 'Urbanismo' },
  },
  {
    key: 'construction-management',
    area: 'construction',
    en: { role: 'Construction Manager' },
    pt: { agent: 'Engenheiro de Obras', agentF: 'Engenheira de Obras', area: 'Gestão de Obras' },
  },
  {
    key: 'surveying',
    area: 'construction',
    en: { role: 'Surveyor' },
    pt: { agent: 'Topógrafo', agentF: 'Topógrafa', area: 'Topografia' },
  },
  {
    key: 'building-tech',
    area: 'construction',
    en: { role: 'Building Technician' },
    pt: { agent: 'Técnico em Edificações', agentF: 'Técnica em Edificações', area: 'Edificações' },
  },
  {
    key: 'drafting',
    area: 'construction',
    en: { role: 'Drafter' },
    pt: { agent: 'Projetista', area: 'Projetos' },
  },

  // ── Industry / Manufacturing / Maintenance ───────────────────────
  {
    key: 'maintenance',
    area: 'industry',
    en: { role: 'Maintenance Technician' },
    pt: { agent: 'Técnico de Manutenção', agentF: 'Técnica de Manutenção', area: 'Manutenção' },
  },
  {
    key: 'production-operation',
    area: 'industry',
    en: { role: 'Production Operator' },
    pt: { agent: 'Operador de Produção', agentF: 'Operadora de Produção', area: 'Produção' },
  },
  {
    key: 'industrial-mechanics',
    area: 'industry',
    en: { role: 'Industrial Mechanic' },
    pt: {
      agent: 'Mecânico Industrial',
      agentF: 'Mecânica Industrial',
      area: 'Mecânica Industrial',
    },
  },
  {
    key: 'electrician',
    area: 'industry',
    en: { role: 'Electrician' },
    pt: { agent: 'Eletricista', area: 'Elétrica' },
  },
  {
    key: 'welding',
    area: 'industry',
    en: { role: 'Welder' },
    pt: { agent: 'Soldador', agentF: 'Soldadora', area: 'Soldagem' },
  },
  {
    key: 'quality-control',
    area: 'industry',
    en: { role: 'Quality Control Inspector' },
    pt: {
      agent: 'Inspetor de Qualidade',
      agentF: 'Inspetora de Qualidade',
      area: 'Controle de Qualidade',
    },
  },
  {
    key: 'safety-tech',
    area: 'industry',
    en: { role: 'Safety Technician' },
    pt: {
      agent: 'Técnico de Segurança do Trabalho',
      agentF: 'Técnica de Segurança do Trabalho',
      area: 'Técnico de Segurança do Trabalho',
    },
  },

  // ── Agro / Environment ───────────────────────────────────────────
  {
    key: 'agronomy',
    area: 'agro',
    en: { role: 'Agronomist' },
    pt: { agent: 'Engenheiro Agrônomo', agentF: 'Engenheira Agrônoma', area: 'Agronomia' },
  },
  {
    key: 'environmental-analysis',
    area: 'agro',
    en: { role: 'Environmental Analyst' },
    pt: { agent: 'Analista Ambiental', area: 'Gestão Ambiental' },
  },
  {
    key: 'zootechnics',
    area: 'agro',
    en: { role: 'Animal Scientist' },
    pt: { agent: 'Zootecnista', area: 'Zootecnia' },
  },

  // ── Hospitality / Services ───────────────────────────────────────
  {
    key: 'gastronomy',
    area: 'hospitality',
    en: { role: 'Chef' },
    pt: { agent: 'Chef de Cozinha', area: 'Gastronomia' },
  },
  {
    key: 'cooking',
    area: 'hospitality',
    en: { role: 'Cook' },
    pt: { agent: 'Cozinheiro', agentF: 'Cozinheira', area: 'Cozinha' },
  },
  {
    key: 'hospitality',
    area: 'hospitality',
    en: { role: 'Hospitality Analyst' },
    pt: { agent: 'Analista de Hotelaria', area: 'Hotelaria' },
  },
  {
    key: 'tourism',
    area: 'hospitality',
    en: { role: 'Tourism Analyst' },
    pt: { agent: 'Analista de Turismo', area: 'Turismo' },
  },
  {
    key: 'events',
    area: 'hospitality',
    en: { role: 'Events Analyst' },
    pt: { agent: 'Analista de Eventos', area: 'Eventos' },
  },

  // ── Social ───────────────────────────────────────────────────────
  {
    key: 'social-work',
    area: 'social',
    en: { role: 'Social Worker' },
    pt: { agent: 'Assistente Social', area: 'Serviço Social' },
  },
];
