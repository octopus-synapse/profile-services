/**
 * Stack Overflow Tags Parser Service
 * Fetches popular tech skills from Stack Overflow tags
 */

import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../../common/logger/logger.service';
import type {
  StackOverflowResponse,
  ParsedSkill,
  SkillType,
} from '../interfaces';

// Skill categorization mappings
const SKILL_CATEGORIES: Record<
  string,
  { type: SkillType; niche: string | null }
> = {
  // Frameworks - Frontend
  react: { type: 'FRAMEWORK', niche: 'frontend' },
  reactjs: { type: 'FRAMEWORK', niche: 'frontend' },
  angular: { type: 'FRAMEWORK', niche: 'frontend' },
  angularjs: { type: 'FRAMEWORK', niche: 'frontend' },
  'vue.js': { type: 'FRAMEWORK', niche: 'frontend' },
  vuejs: { type: 'FRAMEWORK', niche: 'frontend' },
  svelte: { type: 'FRAMEWORK', niche: 'frontend' },
  'next.js': { type: 'FRAMEWORK', niche: 'frontend' },
  nextjs: { type: 'FRAMEWORK', niche: 'frontend' },
  'nuxt.js': { type: 'FRAMEWORK', niche: 'frontend' },
  gatsby: { type: 'FRAMEWORK', niche: 'frontend' },
  'ember.js': { type: 'FRAMEWORK', niche: 'frontend' },
  'backbone.js': { type: 'FRAMEWORK', niche: 'frontend' },

  // Frameworks - Backend
  'node.js': { type: 'FRAMEWORK', niche: 'backend' },
  nodejs: { type: 'FRAMEWORK', niche: 'backend' },
  express: { type: 'FRAMEWORK', niche: 'backend' },
  expressjs: { type: 'FRAMEWORK', niche: 'backend' },
  nestjs: { type: 'FRAMEWORK', niche: 'backend' },
  fastify: { type: 'FRAMEWORK', niche: 'backend' },
  koa: { type: 'FRAMEWORK', niche: 'backend' },
  django: { type: 'FRAMEWORK', niche: 'backend' },
  flask: { type: 'FRAMEWORK', niche: 'backend' },
  fastapi: { type: 'FRAMEWORK', niche: 'backend' },
  spring: { type: 'FRAMEWORK', niche: 'backend' },
  'spring-boot': { type: 'FRAMEWORK', niche: 'backend' },
  rails: { type: 'FRAMEWORK', niche: 'backend' },
  'ruby-on-rails': { type: 'FRAMEWORK', niche: 'backend' },
  laravel: { type: 'FRAMEWORK', niche: 'backend' },
  symfony: { type: 'FRAMEWORK', niche: 'backend' },
  'asp.net': { type: 'FRAMEWORK', niche: 'backend' },
  'asp.net-core': { type: 'FRAMEWORK', niche: 'backend' },
  'asp.net-mvc': { type: 'FRAMEWORK', niche: 'backend' },
  gin: { type: 'FRAMEWORK', niche: 'backend' },
  fiber: { type: 'FRAMEWORK', niche: 'backend' },
  actix: { type: 'FRAMEWORK', niche: 'backend' },
  rocket: { type: 'FRAMEWORK', niche: 'backend' },
  phoenix: { type: 'FRAMEWORK', niche: 'backend' },

  // Frameworks - Mobile
  'react-native': { type: 'FRAMEWORK', niche: 'mobile' },
  flutter: { type: 'FRAMEWORK', niche: 'mobile' },
  ionic: { type: 'FRAMEWORK', niche: 'mobile' },
  xamarin: { type: 'FRAMEWORK', niche: 'mobile' },
  swiftui: { type: 'FRAMEWORK', niche: 'mobile' },
  'jetpack-compose': { type: 'FRAMEWORK', niche: 'mobile' },
  'kotlin-multiplatform': { type: 'FRAMEWORK', niche: 'mobile' },

  // Databases
  mysql: { type: 'DATABASE', niche: 'backend' },
  postgresql: { type: 'DATABASE', niche: 'backend' },
  postgres: { type: 'DATABASE', niche: 'backend' },
  mongodb: { type: 'DATABASE', niche: 'backend' },
  redis: { type: 'DATABASE', niche: 'backend' },
  sqlite: { type: 'DATABASE', niche: 'backend' },
  oracle: { type: 'DATABASE', niche: 'backend' },
  'sql-server': { type: 'DATABASE', niche: 'backend' },
  mariadb: { type: 'DATABASE', niche: 'backend' },
  cassandra: { type: 'DATABASE', niche: 'backend' },
  dynamodb: { type: 'DATABASE', niche: 'backend' },
  elasticsearch: { type: 'DATABASE', niche: 'backend' },
  neo4j: { type: 'DATABASE', niche: 'backend' },
  firebase: { type: 'DATABASE', niche: 'backend' },
  supabase: { type: 'DATABASE', niche: 'backend' },
  prisma: { type: 'LIBRARY', niche: 'backend' },
  typeorm: { type: 'LIBRARY', niche: 'backend' },
  sequelize: { type: 'LIBRARY', niche: 'backend' },
  mongoose: { type: 'LIBRARY', niche: 'backend' },

  // DevOps & Cloud
  docker: { type: 'TOOL', niche: 'devops' },
  kubernetes: { type: 'PLATFORM', niche: 'devops' },
  k8s: { type: 'PLATFORM', niche: 'devops' },
  aws: { type: 'PLATFORM', niche: 'devops' },
  azure: { type: 'PLATFORM', niche: 'devops' },
  'google-cloud-platform': { type: 'PLATFORM', niche: 'devops' },
  gcp: { type: 'PLATFORM', niche: 'devops' },
  terraform: { type: 'TOOL', niche: 'devops' },
  ansible: { type: 'TOOL', niche: 'devops' },
  jenkins: { type: 'TOOL', niche: 'devops' },
  'github-actions': { type: 'TOOL', niche: 'devops' },
  'gitlab-ci': { type: 'TOOL', niche: 'devops' },
  circleci: { type: 'TOOL', niche: 'devops' },
  nginx: { type: 'TOOL', niche: 'devops' },
  apache: { type: 'TOOL', niche: 'devops' },
  linux: { type: 'PLATFORM', niche: 'devops' },
  bash: { type: 'TOOL', niche: 'devops' },
  prometheus: { type: 'TOOL', niche: 'devops' },
  grafana: { type: 'TOOL', niche: 'devops' },
  datadog: { type: 'TOOL', niche: 'devops' },
  heroku: { type: 'PLATFORM', niche: 'devops' },
  vercel: { type: 'PLATFORM', niche: 'devops' },
  netlify: { type: 'PLATFORM', niche: 'devops' },
  digitalocean: { type: 'PLATFORM', niche: 'devops' },

  // Data & AI
  pandas: { type: 'LIBRARY', niche: 'data-science' },
  numpy: { type: 'LIBRARY', niche: 'data-science' },
  'scikit-learn': { type: 'LIBRARY', niche: 'data-science' },
  tensorflow: { type: 'FRAMEWORK', niche: 'machine-learning' },
  pytorch: { type: 'FRAMEWORK', niche: 'machine-learning' },
  keras: { type: 'LIBRARY', niche: 'machine-learning' },
  opencv: { type: 'LIBRARY', niche: 'machine-learning' },
  spark: { type: 'PLATFORM', niche: 'data-engineering' },
  hadoop: { type: 'PLATFORM', niche: 'data-engineering' },
  airflow: { type: 'TOOL', niche: 'data-engineering' },
  kafka: { type: 'PLATFORM', niche: 'data-engineering' },
  dbt: { type: 'TOOL', niche: 'data-engineering' },
  snowflake: { type: 'PLATFORM', niche: 'data-engineering' },
  'power-bi': { type: 'TOOL', niche: 'data-analytics' },
  tableau: { type: 'TOOL', niche: 'data-analytics' },
  looker: { type: 'TOOL', niche: 'data-analytics' },
  metabase: { type: 'TOOL', niche: 'data-analytics' },
  jupyter: { type: 'TOOL', niche: 'data-science' },
  langchain: { type: 'FRAMEWORK', niche: 'machine-learning' },
  huggingface: { type: 'PLATFORM', niche: 'machine-learning' },
  openai: { type: 'PLATFORM', niche: 'machine-learning' },

  // Testing & QA
  jest: { type: 'TOOL', niche: 'qa' },
  mocha: { type: 'TOOL', niche: 'qa' },
  cypress: { type: 'TOOL', niche: 'qa' },
  playwright: { type: 'TOOL', niche: 'qa' },
  selenium: { type: 'TOOL', niche: 'qa' },
  puppeteer: { type: 'TOOL', niche: 'qa' },
  pytest: { type: 'TOOL', niche: 'qa' },
  junit: { type: 'TOOL', niche: 'qa' },
  testng: { type: 'TOOL', niche: 'qa' },
  postman: { type: 'TOOL', niche: 'qa' },
  insomnia: { type: 'TOOL', niche: 'qa' },
  sentry: { type: 'TOOL', niche: 'qa' },
  'new-relic': { type: 'TOOL', niche: 'qa' },
  vitest: { type: 'TOOL', niche: 'qa' },
  'testing-library': { type: 'LIBRARY', niche: 'qa' },

  // Design & UI
  figma: { type: 'TOOL', niche: 'design' },
  sketch: { type: 'TOOL', niche: 'design' },
  'adobe-xd': { type: 'TOOL', niche: 'design' },
  invision: { type: 'TOOL', niche: 'design' },
  zeplin: { type: 'TOOL', niche: 'design' },
  tailwindcss: { type: 'FRAMEWORK', niche: 'frontend' },
  'tailwind-css': { type: 'FRAMEWORK', niche: 'frontend' },
  bootstrap: { type: 'FRAMEWORK', niche: 'frontend' },
  'material-ui': { type: 'LIBRARY', niche: 'frontend' },
  'chakra-ui': { type: 'LIBRARY', niche: 'frontend' },
  'ant-design': { type: 'LIBRARY', niche: 'frontend' },
  'styled-components': { type: 'LIBRARY', niche: 'frontend' },
  emotion: { type: 'LIBRARY', niche: 'frontend' },
  sass: { type: 'TOOL', niche: 'frontend' },
  less: { type: 'TOOL', niche: 'frontend' },
  storybook: { type: 'TOOL', niche: 'frontend' },

  // Security
  oauth: { type: 'METHODOLOGY', niche: 'security' },
  jwt: { type: 'METHODOLOGY', niche: 'security' },
  owasp: { type: 'METHODOLOGY', niche: 'security' },
  'penetration-testing': { type: 'METHODOLOGY', niche: 'security' },
  'burp-suite': { type: 'TOOL', niche: 'security' },
  nmap: { type: 'TOOL', niche: 'security' },
  wireshark: { type: 'TOOL', niche: 'security' },
  metasploit: { type: 'TOOL', niche: 'security' },
  'kali-linux': { type: 'PLATFORM', niche: 'security' },
  'hashicorp-vault': { type: 'TOOL', niche: 'security' },

  // Version Control & Collaboration
  git: { type: 'TOOL', niche: null },
  github: { type: 'PLATFORM', niche: null },
  gitlab: { type: 'PLATFORM', niche: null },
  bitbucket: { type: 'PLATFORM', niche: null },
  jira: { type: 'TOOL', niche: null },
  confluence: { type: 'TOOL', niche: null },
  slack: { type: 'TOOL', niche: null },
  notion: { type: 'TOOL', niche: null },
  trello: { type: 'TOOL', niche: null },
  asana: { type: 'TOOL', niche: null },
  linear: { type: 'TOOL', niche: null },

  // Libraries
  jquery: { type: 'LIBRARY', niche: 'frontend' },
  lodash: { type: 'LIBRARY', niche: null },
  axios: { type: 'LIBRARY', niche: null },
  redux: { type: 'LIBRARY', niche: 'frontend' },
  zustand: { type: 'LIBRARY', niche: 'frontend' },
  mobx: { type: 'LIBRARY', niche: 'frontend' },
  rxjs: { type: 'LIBRARY', niche: null },
  graphql: { type: 'LIBRARY', niche: null },
  apollo: { type: 'LIBRARY', niche: null },
  'socket.io': { type: 'LIBRARY', niche: 'backend' },
  webpack: { type: 'TOOL', niche: 'frontend' },
  vite: { type: 'TOOL', niche: 'frontend' },
  rollup: { type: 'TOOL', niche: 'frontend' },
  esbuild: { type: 'TOOL', niche: 'frontend' },
  babel: { type: 'TOOL', niche: 'frontend' },
  eslint: { type: 'TOOL', niche: null },
  prettier: { type: 'TOOL', niche: null },

  // Methodologies
  agile: { type: 'METHODOLOGY', niche: null },
  scrum: { type: 'METHODOLOGY', niche: null },
  kanban: { type: 'METHODOLOGY', niche: null },
  tdd: { type: 'METHODOLOGY', niche: null },
  bdd: { type: 'METHODOLOGY', niche: null },
  'ci-cd': { type: 'METHODOLOGY', niche: 'devops' },
  devops: { type: 'METHODOLOGY', niche: 'devops' },
  microservices: { type: 'METHODOLOGY', niche: 'backend' },
  serverless: { type: 'METHODOLOGY', niche: 'backend' },
  rest: { type: 'METHODOLOGY', niche: null },
  restful: { type: 'METHODOLOGY', niche: null },
  api: { type: 'METHODOLOGY', niche: null },
  'design-patterns': { type: 'METHODOLOGY', niche: null },
  solid: { type: 'METHODOLOGY', niche: null },
  'clean-architecture': { type: 'METHODOLOGY', niche: null },
  ddd: { type: 'METHODOLOGY', niche: null },
  'event-driven': { type: 'METHODOLOGY', niche: null },
  cqrs: { type: 'METHODOLOGY', niche: null },

  // Blockchain
  solidity: { type: 'LANGUAGE', niche: 'blockchain' },
  web3: { type: 'LIBRARY', niche: 'blockchain' },
  'ethers.js': { type: 'LIBRARY', niche: 'blockchain' },
  hardhat: { type: 'TOOL', niche: 'blockchain' },
  truffle: { type: 'TOOL', niche: 'blockchain' },
  ethereum: { type: 'PLATFORM', niche: 'blockchain' },

  // Other tools
  vscode: { type: 'TOOL', niche: null },
  intellij: { type: 'TOOL', niche: null },
  vim: { type: 'TOOL', niche: null },
  neovim: { type: 'TOOL', niche: null },
  emacs: { type: 'TOOL', niche: null },
};

// Portuguese translations
const SKILL_TRANSLATIONS: Record<string, string> = {
  react: 'React',
  angular: 'Angular',
  'vue.js': 'Vue.js',
  'node.js': 'Node.js',
  express: 'Express',
  django: 'Django',
  flask: 'Flask',
  spring: 'Spring',
  docker: 'Docker',
  kubernetes: 'Kubernetes',
  aws: 'AWS',
  azure: 'Azure',
  git: 'Git',
  mysql: 'MySQL',
  postgresql: 'PostgreSQL',
  mongodb: 'MongoDB',
  redis: 'Redis',
  linux: 'Linux',
  agile: 'Ágil',
  scrum: 'Scrum',
  kanban: 'Kanban',
  tdd: 'TDD',
  bdd: 'BDD',
  'ci-cd': 'CI/CD',
  devops: 'DevOps',
  microservices: 'Microsserviços',
  serverless: 'Serverless',
  rest: 'REST',
  api: 'API',
  'design-patterns': 'Padrões de Projeto',
  'clean-architecture': 'Arquitetura Limpa',
  'machine-learning': 'Machine Learning',
  'artificial-intelligence': 'Inteligência Artificial',
  'data-science': 'Ciência de Dados',
  'big-data': 'Big Data',
  blockchain: 'Blockchain',
  security: 'Segurança',
  testing: 'Testes',
  frontend: 'Frontend',
  backend: 'Backend',
  fullstack: 'Fullstack',
  mobile: 'Mobile',
};

// Skill colors (brand colors where applicable)
const SKILL_COLORS: Record<string, string> = {
  react: '#61DAFB',
  angular: '#DD0031',
  'vue.js': '#4FC08D',
  svelte: '#FF3E00',
  'next.js': '#000000',
  'node.js': '#339933',
  express: '#000000',
  nestjs: '#E0234E',
  django: '#092E20',
  flask: '#000000',
  fastapi: '#009688',
  spring: '#6DB33F',
  laravel: '#FF2D20',
  rails: '#CC0000',
  docker: '#2496ED',
  kubernetes: '#326CE5',
  aws: '#FF9900',
  azure: '#0078D4',
  gcp: '#4285F4',
  terraform: '#7B42BC',
  mysql: '#4479A1',
  postgresql: '#336791',
  mongodb: '#47A248',
  redis: '#DC382D',
  elasticsearch: '#005571',
  firebase: '#FFCA28',
  git: '#F05032',
  github: '#181717',
  gitlab: '#FCA121',
  figma: '#F24E1E',
  tailwindcss: '#06B6D4',
  bootstrap: '#7952B3',
  graphql: '#E10098',
  tensorflow: '#FF6F00',
  pytorch: '#EE4C2C',
  jest: '#C21325',
  cypress: '#17202C',
  selenium: '#43B02A',
};

@Injectable()
export class StackOverflowParserService {
  private readonly SO_API_URL = 'https://api.stackexchange.com/2.3/tags';
  private readonly MAX_PAGES = 10; // Fetch top 1000 tags (100 per page)

  constructor(private readonly logger: AppLoggerService) {}

  /**
   * Fetch and parse skills from Stack Overflow tags
   */
  async fetchAndParse(): Promise<ParsedSkill[]> {
    this.logger.log('Fetching Stack Overflow tags...');

    const allTags: { name: string; count: number }[] = [];

    try {
      // Fetch multiple pages of tags
      for (let page = 1; page <= this.MAX_PAGES; page++) {
        const url = `${this.SO_API_URL}?page=${page}&pagesize=100&order=desc&sort=popular&site=stackoverflow`;

        const response = await fetch(url);
        if (!response.ok) {
          this.logger.warn(`Failed to fetch page ${page}: ${response.status}`);
          break;
        }

        const data: StackOverflowResponse = await response.json();

        for (const tag of data.items) {
          allTags.push({ name: tag.name, count: tag.count });
        }

        if (!data.has_more) break;

        // Rate limiting - wait 100ms between requests
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      return this.parseTags(allTags);
    } catch (error) {
      this.logger.error('Failed to fetch Stack Overflow tags', error);
      throw error;
    }
  }

  /**
   * Parse tags into structured skill data
   */
  private parseTags(tags: { name: string; count: number }[]): ParsedSkill[] {
    const parsed: ParsedSkill[] = [];
    const seenSlugs = new Set<string>();
    // Helper to avoid prototype pollution (e.g., "constructor" tag)
    const hasOwn = (obj: Record<string, unknown>, key: string) =>
      Object.prototype.hasOwnProperty.call(obj, key);

    for (const tag of tags) {
      const slug = this.normalizeSlug(tag.name);
      const tagLower = tag.name.toLowerCase();

      // Skip if already seen or is a programming language (handled by Linguist)
      if (seenSlugs.has(slug)) continue;
      if (this.isProgrammingLanguage(tag.name)) continue;

      const category = (hasOwn(SKILL_CATEGORIES, tagLower)
        ? SKILL_CATEGORIES[tagLower]
        : null) ||
        (hasOwn(SKILL_CATEGORIES, slug) ? SKILL_CATEGORIES[slug] : null) || {
          type: 'OTHER' as SkillType,
          niche: null,
        };

      // Skip generic/non-tech tags
      if (this.shouldSkipTag(tag.name)) continue;

      seenSlugs.add(slug);

      parsed.push({
        slug,
        nameEn: this.formatDisplayName(tag.name),
        namePtBr:
          (hasOwn(SKILL_TRANSLATIONS, tagLower)
            ? SKILL_TRANSLATIONS[tagLower]
            : null) ||
          (hasOwn(SKILL_TRANSLATIONS, slug)
            ? SKILL_TRANSLATIONS[slug]
            : null) ||
          this.formatDisplayName(tag.name),
        type: category.type,
        nicheSlug: category.niche,
        color:
          (hasOwn(SKILL_COLORS, tagLower) ? SKILL_COLORS[tagLower] : null) ||
          (hasOwn(SKILL_COLORS, slug) ? SKILL_COLORS[slug] : null) ||
          null,
        icon: null,
        website: null,
        aliases: this.getAliases(tag.name),
        keywords: this.getKeywords(tag.name),
        popularity: tag.count,
      });
    }

    this.logger.log(`Parsed ${parsed.length} skills from Stack Overflow tags`);
    return parsed;
  }

  /**
   * Normalize tag name to slug
   */
  private normalizeSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/\./g, '-')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Format tag name for display
   */
  private formatDisplayName(name: string): string {
    const specialCases: Record<string, string> = {
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      nodejs: 'Node.js',
      'node.js': 'Node.js',
      reactjs: 'React',
      vuejs: 'Vue.js',
      angularjs: 'AngularJS',
      nextjs: 'Next.js',
      nuxtjs: 'Nuxt.js',
      expressjs: 'Express',
      nestjs: 'NestJS',
      graphql: 'GraphQL',
      mongodb: 'MongoDB',
      postgresql: 'PostgreSQL',
      mysql: 'MySQL',
      aws: 'AWS',
      gcp: 'Google Cloud',
      css: 'CSS',
      html: 'HTML',
      sql: 'SQL',
      api: 'API',
      rest: 'REST',
      oauth: 'OAuth',
      jwt: 'JWT',
      'ci-cd': 'CI/CD',
      devops: 'DevOps',
      ios: 'iOS',
      macos: 'macOS',
    };

    const lower = name.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(specialCases, lower)) {
      return specialCases[lower];
    }

    // Title case
    return name
      .split(/[-_\s]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Check if tag is a programming language (handled by GitHub Linguist)
   */
  private isProgrammingLanguage(name: string): boolean {
    const languages = new Set([
      'javascript',
      'typescript',
      'python',
      'java',
      'c#',
      'c++',
      'c',
      'go',
      'rust',
      'ruby',
      'php',
      'swift',
      'kotlin',
      'scala',
      'r',
      'perl',
      'haskell',
      'elixir',
      'erlang',
      'clojure',
      'f#',
      'lua',
      'dart',
      'julia',
      'matlab',
      'fortran',
      'cobol',
      'pascal',
      'assembly',
      'bash',
      'powershell',
      'shell',
      'objective-c',
      'groovy',
      'visual-basic',
      'vba',
      'delphi',
      'zig',
      'nim',
      'crystal',
      'v',
      'solidity',
    ]);

    return languages.has(name.toLowerCase());
  }

  /**
   * Check if tag should be skipped (generic/non-tech)
   */
  private shouldSkipTag(name: string): boolean {
    const skipTags = new Set([
      'arrays',
      'string',
      'list',
      'dictionary',
      'object',
      'function',
      'class',
      'loops',
      'if-statement',
      'variables',
      'sorting',
      'regex',
      'date',
      'datetime',
      'file',
      'json',
      'xml',
      'csv',
      'image',
      'video',
      'audio',
      'math',
      'algorithm',
      'recursion',
      'debugging',
      'performance',
      'memory',
      'multithreading',
      'asynchronous',
      'oop',
      'inheritance',
      'polymorphism',
      'exception',
      'error-handling',
      'unit-testing',
      'logging',
      'authentication',
      'authorization',
      'encryption',
      'hashing',
      'http',
      'https',
      'tcp',
      'udp',
      'websocket',
      'cors',
      'cookies',
      'session',
      'cache',
      'optimization',
      'deployment',
      'documentation',
      'version-control',
      'code-review',
      // Too generic
      'android',
      'ios',
      'windows',
      'macos',
      'ubuntu',
      'debian',
      'web',
      'mobile',
      'desktop',
      'server',
      'client',
      'browser',
      'database',
      'frontend',
      'backend',
      'fullstack',
    ]);

    return skipTags.has(name.toLowerCase());
  }

  /**
   * Get aliases for a skill
   */
  private getAliases(name: string): string[] {
    const aliasMap: Record<string, string[]> = {
      react: ['reactjs', 'react.js'],
      'vue.js': ['vuejs', 'vue'],
      'node.js': ['nodejs', 'node'],
      'next.js': ['nextjs', 'next'],
      angular: ['angularjs', 'ng'],
      express: ['expressjs', 'express.js'],
      typescript: ['ts'],
      javascript: ['js', 'es6', 'ecmascript'],
      kubernetes: ['k8s'],
      postgresql: ['postgres', 'psql'],
      mongodb: ['mongo'],
      elasticsearch: ['elastic', 'es'],
      tailwindcss: ['tailwind', 'tailwind-css'],
    };

    const lower = name.toLowerCase();
    return Object.prototype.hasOwnProperty.call(aliasMap, lower)
      ? aliasMap[lower]
      : [];
  }

  /**
   * Get search keywords for a skill
   */
  private getKeywords(name: string): string[] {
    const keywordMap: Record<string, string[]> = {
      react: ['ui', 'components', 'hooks', 'jsx', 'frontend'],
      'node.js': ['server', 'backend', 'runtime', 'npm'],
      docker: ['container', 'containerization', 'devops'],
      kubernetes: ['orchestration', 'container', 'cluster', 'devops'],
      aws: ['cloud', 'amazon', 'infrastructure'],
      postgresql: ['database', 'sql', 'relational'],
      mongodb: ['database', 'nosql', 'document'],
      graphql: ['api', 'query', 'schema'],
      tensorflow: ['ai', 'ml', 'deep-learning', 'neural-network'],
      figma: ['design', 'ui', 'ux', 'prototype'],
    };

    const lower = name.toLowerCase();
    return Object.prototype.hasOwnProperty.call(keywordMap, lower)
      ? keywordMap[lower]
      : [];
  }
}
