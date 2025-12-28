/**
 * Tech Skills Sync Service
 * Synchronizes tech skills from external sources (GitHub Linguist, Stack Overflow)
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { GithubLinguistParserService } from './github-linguist-parser.service';
import { StackOverflowParserService } from './stackoverflow-parser.service';
import type {
  TechSkillsSyncResult,
  ParsedLanguage,
  ParsedSkill,
  TechAreaType,
} from '../interfaces';

// Predefined tech areas and niches
const TECH_AREAS: Array<{
  type: TechAreaType;
  nameEn: string;
  namePtBr: string;
  descriptionEn: string;
  descriptionPtBr: string;
  icon: string;
  color: string;
  order: number;
}> = [
  {
    type: 'DEVELOPMENT',
    nameEn: 'Development',
    namePtBr: 'Desenvolvimento',
    descriptionEn: 'Software development and programming',
    descriptionPtBr: 'Desenvolvimento de software e programação',
    icon: 'code',
    color: '#3B82F6',
    order: 1,
  },
  {
    type: 'DEVOPS',
    nameEn: 'DevOps & Infrastructure',
    namePtBr: 'DevOps e Infraestrutura',
    descriptionEn: 'DevOps, cloud infrastructure, and operations',
    descriptionPtBr: 'DevOps, infraestrutura cloud e operações',
    icon: 'server',
    color: '#8B5CF6',
    order: 2,
  },
  {
    type: 'DATA',
    nameEn: 'Data & AI',
    namePtBr: 'Dados e IA',
    descriptionEn: 'Data science, analytics, machine learning, and AI',
    descriptionPtBr: 'Ciência de dados, analytics, machine learning e IA',
    icon: 'database',
    color: '#10B981',
    order: 3,
  },
  {
    type: 'SECURITY',
    nameEn: 'Security',
    namePtBr: 'Segurança',
    descriptionEn: 'Cybersecurity, penetration testing, and compliance',
    descriptionPtBr: 'Cibersegurança, testes de penetração e conformidade',
    icon: 'shield',
    color: '#EF4444',
    order: 4,
  },
  {
    type: 'DESIGN',
    nameEn: 'Design',
    namePtBr: 'Design',
    descriptionEn: 'UI/UX design, product design, and visual design',
    descriptionPtBr: 'Design UI/UX, design de produto e design visual',
    icon: 'palette',
    color: '#EC4899',
    order: 5,
  },
  {
    type: 'PRODUCT',
    nameEn: 'Product',
    namePtBr: 'Produto',
    descriptionEn: 'Product management, strategy, and growth',
    descriptionPtBr: 'Gestão de produto, estratégia e crescimento',
    icon: 'lightbulb',
    color: '#F59E0B',
    order: 6,
  },
  {
    type: 'QA',
    nameEn: 'Quality Assurance',
    namePtBr: 'Qualidade',
    descriptionEn: 'Testing, quality assurance, and automation',
    descriptionPtBr: 'Testes, garantia de qualidade e automação',
    icon: 'check-circle',
    color: '#14B8A6',
    order: 7,
  },
  {
    type: 'INFRASTRUCTURE',
    nameEn: 'Infrastructure',
    namePtBr: 'Infraestrutura',
    descriptionEn: 'Networks, systems administration, and hardware',
    descriptionPtBr: 'Redes, administração de sistemas e hardware',
    icon: 'network',
    color: '#6366F1',
    order: 8,
  },
  {
    type: 'OTHER',
    nameEn: 'Other',
    namePtBr: 'Outros',
    descriptionEn: 'Other tech skills and tools',
    descriptionPtBr: 'Outras habilidades e ferramentas tech',
    icon: 'more-horizontal',
    color: '#64748B',
    order: 99,
  },
];

// Predefined niches
const TECH_NICHES: Array<{
  slug: string;
  areaType: TechAreaType;
  nameEn: string;
  namePtBr: string;
  descriptionEn: string;
  descriptionPtBr: string;
  icon: string;
  color: string;
  order: number;
}> = [
  // Development niches
  {
    slug: 'frontend',
    areaType: 'DEVELOPMENT',
    nameEn: 'Frontend',
    namePtBr: 'Frontend',
    descriptionEn: 'User interface and client-side development',
    descriptionPtBr: 'Interface do usuário e desenvolvimento client-side',
    icon: 'layout',
    color: '#3B82F6',
    order: 1,
  },
  {
    slug: 'backend',
    areaType: 'DEVELOPMENT',
    nameEn: 'Backend',
    namePtBr: 'Backend',
    descriptionEn: 'Server-side development and APIs',
    descriptionPtBr: 'Desenvolvimento server-side e APIs',
    icon: 'server',
    color: '#10B981',
    order: 2,
  },
  {
    slug: 'fullstack',
    areaType: 'DEVELOPMENT',
    nameEn: 'Fullstack',
    namePtBr: 'Fullstack',
    descriptionEn: 'Full-stack web development',
    descriptionPtBr: 'Desenvolvimento web full-stack',
    icon: 'layers',
    color: '#8B5CF6',
    order: 3,
  },
  {
    slug: 'mobile',
    areaType: 'DEVELOPMENT',
    nameEn: 'Mobile',
    namePtBr: 'Mobile',
    descriptionEn: 'iOS, Android, and cross-platform mobile development',
    descriptionPtBr: 'Desenvolvimento mobile iOS, Android e multiplataforma',
    icon: 'smartphone',
    color: '#F59E0B',
    order: 4,
  },
  {
    slug: 'game-dev',
    areaType: 'DEVELOPMENT',
    nameEn: 'Game Development',
    namePtBr: 'Desenvolvimento de Jogos',
    descriptionEn: 'Video game development',
    descriptionPtBr: 'Desenvolvimento de jogos',
    icon: 'gamepad',
    color: '#EF4444',
    order: 5,
  },
  {
    slug: 'embedded',
    areaType: 'DEVELOPMENT',
    nameEn: 'Embedded Systems',
    namePtBr: 'Sistemas Embarcados',
    descriptionEn: 'Embedded and IoT development',
    descriptionPtBr: 'Desenvolvimento embarcado e IoT',
    icon: 'cpu',
    color: '#6366F1',
    order: 6,
  },
  {
    slug: 'blockchain',
    areaType: 'DEVELOPMENT',
    nameEn: 'Blockchain',
    namePtBr: 'Blockchain',
    descriptionEn: 'Blockchain and Web3 development',
    descriptionPtBr: 'Desenvolvimento blockchain e Web3',
    icon: 'link',
    color: '#14B8A6',
    order: 7,
  },

  // DevOps niches
  {
    slug: 'devops',
    areaType: 'DEVOPS',
    nameEn: 'DevOps',
    namePtBr: 'DevOps',
    descriptionEn: 'CI/CD, automation, and DevOps practices',
    descriptionPtBr: 'CI/CD, automação e práticas DevOps',
    icon: 'git-branch',
    color: '#8B5CF6',
    order: 1,
  },
  {
    slug: 'cloud',
    areaType: 'DEVOPS',
    nameEn: 'Cloud',
    namePtBr: 'Cloud',
    descriptionEn: 'Cloud platforms and services',
    descriptionPtBr: 'Plataformas e serviços cloud',
    icon: 'cloud',
    color: '#3B82F6',
    order: 2,
  },
  {
    slug: 'sre',
    areaType: 'DEVOPS',
    nameEn: 'Site Reliability',
    namePtBr: 'Confiabilidade de Site',
    descriptionEn: 'Site reliability engineering and monitoring',
    descriptionPtBr: 'Engenharia de confiabilidade e monitoramento',
    icon: 'activity',
    color: '#EF4444',
    order: 3,
  },

  // Data niches
  {
    slug: 'data-science',
    areaType: 'DATA',
    nameEn: 'Data Science',
    namePtBr: 'Ciência de Dados',
    descriptionEn: 'Data analysis and statistical modeling',
    descriptionPtBr: 'Análise de dados e modelagem estatística',
    icon: 'bar-chart',
    color: '#10B981',
    order: 1,
  },
  {
    slug: 'machine-learning',
    areaType: 'DATA',
    nameEn: 'Machine Learning',
    namePtBr: 'Machine Learning',
    descriptionEn: 'Machine learning and deep learning',
    descriptionPtBr: 'Machine learning e deep learning',
    icon: 'brain',
    color: '#8B5CF6',
    order: 2,
  },
  {
    slug: 'data-engineering',
    areaType: 'DATA',
    nameEn: 'Data Engineering',
    namePtBr: 'Engenharia de Dados',
    descriptionEn: 'Data pipelines and infrastructure',
    descriptionPtBr: 'Pipelines de dados e infraestrutura',
    icon: 'database',
    color: '#F59E0B',
    order: 3,
  },
  {
    slug: 'data-analytics',
    areaType: 'DATA',
    nameEn: 'Data Analytics',
    namePtBr: 'Análise de Dados',
    descriptionEn: 'Business intelligence and analytics',
    descriptionPtBr: 'Business intelligence e analytics',
    icon: 'pie-chart',
    color: '#3B82F6',
    order: 4,
  },

  // Security niches
  {
    slug: 'security',
    areaType: 'SECURITY',
    nameEn: 'Security',
    namePtBr: 'Segurança',
    descriptionEn: 'Application and infrastructure security',
    descriptionPtBr: 'Segurança de aplicações e infraestrutura',
    icon: 'shield',
    color: '#EF4444',
    order: 1,
  },
  {
    slug: 'pentesting',
    areaType: 'SECURITY',
    nameEn: 'Penetration Testing',
    namePtBr: 'Teste de Penetração',
    descriptionEn: 'Ethical hacking and vulnerability assessment',
    descriptionPtBr: 'Hacking ético e avaliação de vulnerabilidades',
    icon: 'target',
    color: '#DC2626',
    order: 2,
  },

  // Design niches
  {
    slug: 'design',
    areaType: 'DESIGN',
    nameEn: 'UI/UX Design',
    namePtBr: 'Design UI/UX',
    descriptionEn: 'User interface and experience design',
    descriptionPtBr: 'Design de interface e experiência do usuário',
    icon: 'figma',
    color: '#EC4899',
    order: 1,
  },

  // QA niches
  {
    slug: 'qa',
    areaType: 'QA',
    nameEn: 'QA Testing',
    namePtBr: 'Testes QA',
    descriptionEn: 'Manual and automated testing',
    descriptionPtBr: 'Testes manuais e automatizados',
    icon: 'check-square',
    color: '#14B8A6',
    order: 1,
  },
  {
    slug: 'test-automation',
    areaType: 'QA',
    nameEn: 'Test Automation',
    namePtBr: 'Automação de Testes',
    descriptionEn: 'Test automation frameworks and tools',
    descriptionPtBr: 'Frameworks e ferramentas de automação de testes',
    icon: 'play-circle',
    color: '#10B981',
    order: 2,
  },

  // Infrastructure niches
  {
    slug: 'networks',
    areaType: 'INFRASTRUCTURE',
    nameEn: 'Networks',
    namePtBr: 'Redes',
    descriptionEn: 'Network administration and architecture',
    descriptionPtBr: 'Administração e arquitetura de redes',
    icon: 'wifi',
    color: '#6366F1',
    order: 1,
  },
  {
    slug: 'sysadmin',
    areaType: 'INFRASTRUCTURE',
    nameEn: 'System Administration',
    namePtBr: 'Administração de Sistemas',
    descriptionEn: 'Server and system administration',
    descriptionPtBr: 'Administração de servidores e sistemas',
    icon: 'terminal',
    color: '#64748B',
    order: 2,
  },
];

@Injectable()
export class TechSkillsSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly logger: AppLoggerService,
    private readonly linguistParser: GithubLinguistParserService,
    private readonly stackOverflowParser: StackOverflowParserService,
  ) {}

  /**
   * Run full sync of tech skills from external sources
   */
  async runSync(): Promise<TechSkillsSyncResult> {
    this.logger.log('Starting tech skills sync...');

    const result: TechSkillsSyncResult = {
      languagesInserted: 0,
      languagesUpdated: 0,
      skillsInserted: 0,
      skillsUpdated: 0,
      areasCreated: 0,
      nichesCreated: 0,
      errors: [],
    };

    try {
      // 1. Create/update tech areas
      result.areasCreated = await this.syncTechAreas();
      this.logger.log(
        `Tech areas synced: ${result.areasCreated} created/updated`,
      );

      // 2. Create/update tech niches
      result.nichesCreated = await this.syncTechNiches();
      this.logger.log(
        `Tech niches synced: ${result.nichesCreated} created/updated`,
      );

      // 3. Fetch and sync programming languages from GitHub Linguist
      const languages = await this.linguistParser.fetchAndParse();
      const langResult = await this.syncLanguages(languages);
      result.languagesInserted = langResult.inserted;
      result.languagesUpdated = langResult.updated;
      this.logger.log(
        `Languages synced: ${langResult.inserted} inserted, ${langResult.updated} updated`,
      );

      // 4. Fetch and sync skills from Stack Overflow
      const skills = await this.stackOverflowParser.fetchAndParse();
      const skillResult = await this.syncSkills(skills);
      result.skillsInserted = skillResult.inserted;
      result.skillsUpdated = skillResult.updated;
      this.logger.log(
        `Skills synced: ${skillResult.inserted} inserted, ${skillResult.updated} updated`,
      );

      // 5. Clear cache
      await this.clearCache();

      this.logger.log('Tech skills sync completed successfully');
    } catch (error) {
      this.logger.error('Tech skills sync failed', error);
      result.errors.push(
        error instanceof Error ? error.message : String(error),
      );
    }

    return result;
  }

  /**
   * Sync tech areas
   */
  private async syncTechAreas(): Promise<number> {
    let count = 0;

    for (const area of TECH_AREAS) {
      await this.prisma.techArea.upsert({
        where: { type: area.type },
        create: area,
        update: {
          nameEn: area.nameEn,
          namePtBr: area.namePtBr,
          descriptionEn: area.descriptionEn,
          descriptionPtBr: area.descriptionPtBr,
          icon: area.icon,
          color: area.color,
          order: area.order,
        },
      });
      count++;
    }

    return count;
  }

  /**
   * Sync tech niches
   */
  private async syncTechNiches(): Promise<number> {
    let count = 0;

    for (const niche of TECH_NICHES) {
      const area = await this.prisma.techArea.findUnique({
        where: { type: niche.areaType },
      });

      if (!area) {
        this.logger.warn(
          `Area not found for niche ${niche.slug}: ${niche.areaType}`,
        );
        continue;
      }

      await this.prisma.techNiche.upsert({
        where: { slug: niche.slug },
        create: {
          slug: niche.slug,
          nameEn: niche.nameEn,
          namePtBr: niche.namePtBr,
          descriptionEn: niche.descriptionEn,
          descriptionPtBr: niche.descriptionPtBr,
          icon: niche.icon,
          color: niche.color,
          order: niche.order,
          areaId: area.id,
        },
        update: {
          nameEn: niche.nameEn,
          namePtBr: niche.namePtBr,
          descriptionEn: niche.descriptionEn,
          descriptionPtBr: niche.descriptionPtBr,
          icon: niche.icon,
          color: niche.color,
          order: niche.order,
          areaId: area.id,
        },
      });
      count++;
    }

    return count;
  }

  /**
   * Sync programming languages
   */
  private async syncLanguages(
    languages: ParsedLanguage[],
  ): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    for (const lang of languages) {
      const existing = await this.prisma.programmingLanguage.findUnique({
        where: { slug: lang.slug },
      });

      if (existing) {
        await this.prisma.programmingLanguage.update({
          where: { slug: lang.slug },
          data: {
            nameEn: lang.nameEn,
            namePtBr: lang.namePtBr,
            color: lang.color,
            website: lang.website,
            aliases: lang.aliases,
            fileExtensions: lang.extensions,
            paradigms: lang.paradigms,
            typing: lang.typing,
            popularity: lang.popularity,
          },
        });
        updated++;
      } else {
        await this.prisma.programmingLanguage.create({
          data: {
            slug: lang.slug,
            nameEn: lang.nameEn,
            namePtBr: lang.namePtBr,
            color: lang.color,
            website: lang.website,
            aliases: lang.aliases,
            fileExtensions: lang.extensions,
            paradigms: lang.paradigms,
            typing: lang.typing,
            popularity: lang.popularity,
          },
        });
        inserted++;
      }
    }

    return { inserted, updated };
  }

  /**
   * Sync tech skills
   */
  private async syncSkills(
    skills: ParsedSkill[],
  ): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    for (const skill of skills) {
      // Find niche if specified
      let nicheId: string | null = null;
      if (skill.nicheSlug) {
        const niche = await this.prisma.techNiche.findUnique({
          where: { slug: skill.nicheSlug },
        });
        nicheId = niche?.id || null;
      }

      const existing = await this.prisma.techSkill.findUnique({
        where: { slug: skill.slug },
      });

      if (existing) {
        await this.prisma.techSkill.update({
          where: { slug: skill.slug },
          data: {
            nameEn: skill.nameEn,
            namePtBr: skill.namePtBr,
            type: skill.type,
            nicheId,
            color: skill.color,
            icon: skill.icon,
            website: skill.website,
            aliases: skill.aliases,
            keywords: skill.keywords,
            popularity: skill.popularity,
          },
        });
        updated++;
      } else {
        await this.prisma.techSkill.create({
          data: {
            slug: skill.slug,
            nameEn: skill.nameEn,
            namePtBr: skill.namePtBr,
            type: skill.type,
            nicheId,
            color: skill.color,
            icon: skill.icon,
            website: skill.website,
            aliases: skill.aliases,
            keywords: skill.keywords,
            popularity: skill.popularity,
          },
        });
        inserted++;
      }
    }

    return { inserted, updated };
  }

  /**
   * Clear all tech skills cache
   */
  private async clearCache(): Promise<void> {
    await Promise.all([
      this.cache.delete('tech:languages:list'),
      this.cache.delete('tech:skills:list'),
      this.cache.delete('tech:niches:list'),
      this.cache.delete('tech:areas:list'),
      this.cache.deletePattern('tech:skills:*'),
    ]);
  }
}
