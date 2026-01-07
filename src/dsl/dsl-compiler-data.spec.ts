import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import {
  DslCompilerService,
  ResumeWithRelations,
} from './dsl-compiler.service';
import { DslValidatorService } from './dsl-validator.service';
import { TokenResolverService } from './token-resolver.service';
import type { ResumeDsl } from '@octopus-synapse/profile-contracts';
import { ResumeTemplate } from '@prisma/client';

describe('DslCompilerService - Data Mapping', () => {
  let service: DslCompilerService;

  const mockResume: ResumeWithRelations = {
    id: 'resume-1',
    userId: 'user-1',
    title: 'My Resume',
    template: ResumeTemplate.PROFESSIONAL,
    language: 'en',
    isPublic: true,
    slug: 'my-resume',
    contentPtBr: null,
    contentEn: null,
    primaryLanguage: 'en',
    techPersona: 'Full Stack Developer',
    techArea: 'Web',
    primaryStack: ['React', 'Node.js'],
    experienceYears: 5,
    fullName: 'John Doe',
    jobTitle: 'Senior Developer',
    phone: '123-456-7890',
    emailContact: 'john@example.com',
    location: 'New York, NY',
    linkedin: 'linkedin.com/in/johndoe',
    github: 'github.com/johndoe',
    website: 'johndoe.com',
    summary: 'Experienced developer...',
    currentCompanyLogo: null,
    twitter: null,
    medium: null,
    devto: null,
    stackoverflow: null,
    kaggle: null,
    hackerrank: null,
    leetcode: null,
    accentColor: null,
    customTheme: null,
    activeThemeId: null,
    profileViews: 0,
    totalStars: 0,
    totalCommits: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: null,
    experiences: [
      {
        id: 'exp-1',
        resumeId: 'resume-1',
        company: 'Tech Corp',
        position: 'Senior Dev',
        startDate: new Date('2022-01-01'),
        endDate: null,
        isCurrent: true,
        location: 'Remote',
        description: 'Building cool stuff',
        skills: ['React', 'NestJS'],
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'exp-2',
        resumeId: 'resume-1',
        company: 'Old Corp',
        position: 'Junior Dev',
        startDate: new Date('2020-01-01'),
        endDate: new Date('2021-12-31'),
        isCurrent: false,
        location: 'Office',
        description: 'Fixing bugs',
        skills: ['jQuery'],
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    education: [],
    skills: [],
    languages: [],
    projects: [],
    certifications: [],
    awards: [],
    recommendations: [],
    interests: [],
  };

  const validDsl: ResumeDsl = {
    version: '1.0.0',
    layout: {
      type: 'single-column',
      paperSize: 'a4',
      margins: 'normal',
      pageBreakBehavior: 'auto',
      showPageNumbers: false,
      pageNumberPosition: 'bottom-center',
    },
    tokens: {
      typography: {
        fontFamily: { heading: 'inter', body: 'inter' },
        fontSize: 'base',
        headingStyle: 'minimal',
      },
      colors: {
        colors: {
          primary: '#000',
          secondary: '#000',
          background: '#fff',
          surface: '#fff',
          text: { primary: '#000', secondary: '#000', accent: '#000' },
          border: '#000',
          divider: '#000',
        },
        borderRadius: 'none',
        shadows: 'none',
      },
      spacing: {
        density: 'comfortable',
        sectionGap: 'md',
        itemGap: 'md',
        contentPadding: 'md',
      },
    },
    sections: [
      { id: 'experience', visible: true, column: 'main', order: 0 },
      { id: 'summary', visible: true, column: 'main', order: 1 },
    ],
    itemOverrides: {
      experience: [
        { itemId: 'exp-2', visible: false, order: 1 }, // Hide old job
      ],
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DslCompilerService,
        DslValidatorService,
        TokenResolverService,
      ],
    }).compile();

    service = module.get<DslCompilerService>(DslCompilerService);
  });

  it('should compile section data correctly', () => {
    const ast = service.compileForHtml(validDsl, mockResume);

    const experienceSection = ast.sections.find(
      (s) => s.sectionId === 'experience',
    );
    expect(experienceSection).toBeDefined();
    expect(experienceSection?.data.type).toBe('experience');

    if (experienceSection?.data.type === 'experience') {
      expect(experienceSection.data.items).toHaveLength(1); // exp-2 is hidden
      expect(experienceSection.data.items[0].id).toBe('exp-1');
      expect(experienceSection.data.items[0].title).toBe('Senior Dev');
      expect(experienceSection.data.items[0].dateRange.isCurrent).toBe(true);
    }

    const summarySection = ast.sections.find((s) => s.sectionId === 'summary');
    expect(summarySection).toBeDefined();
    expect(summarySection?.data.type).toBe('summary');
    if (summarySection?.data.type === 'summary') {
      expect(summarySection.data.data.content).toBe('Experienced developer...');
    }
  });

  it('should use placeholder data when resume is not provided', () => {
    const ast = service.compileForHtml(validDsl);

    const experienceSection = ast.sections.find(
      (s) => s.sectionId === 'experience',
    );
    expect(experienceSection).toBeDefined();
    expect(experienceSection?.data.type).toBe('experience');
    if (experienceSection?.data.type === 'experience') {
      expect(experienceSection.data.items).toHaveLength(0);
    }
  });
});
