import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface JsonResumeBasics {
  name: string;
  label: string;
  email?: string;
  phone?: string;
  url?: string;
  summary?: string;
  location?: {
    city?: string;
    countryCode?: string;
  };
}

interface JsonResumeWork {
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  summary?: string;
  highlights?: string[];
}

interface JsonResumeEducation {
  institution: string;
  studyType: string;
  startDate: string;
  endDate?: string;
  area?: string;
}

interface JsonResumeSkill {
  name: string;
  level: string;
  keywords?: string[];
}

interface JsonResume {
  $schema: string;
  basics: JsonResumeBasics;
  work: JsonResumeWork[];
  education: JsonResumeEducation[];
  skills: JsonResumeSkill[];
  languages?: { language: string; fluency: string }[];
  projects?: { name: string; description: string; url?: string }[];
}

interface ProfileFormat {
  format: 'profile';
  version: string;
  resume: Record<string, unknown>;
}

export interface JsonExportOptions {
  format?: 'jsonresume' | 'profile';
  language?: 'en' | 'pt';
}

@Injectable()
export class ResumeJsonService {
  constructor(private readonly prisma: PrismaService) {}

  async exportAsJson(
    resumeId: string,
    options: JsonExportOptions = {},
  ): Promise<JsonResume | ProfileFormat> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        user: true,
        experiences: { orderBy: { startDate: 'desc' } },
        education: { orderBy: { startDate: 'desc' } },
        skills: true,
        languages: true,
        openSource: true,
        certifications: true,
      },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    if (options.format === 'profile') {
      return this.toProfileFormat(resume);
    }

    return this.toJsonResume(resume);
  }

  async exportAsBuffer(
    resumeId: string,
    options: JsonExportOptions = {},
  ): Promise<Buffer> {
    const json = await this.exportAsJson(resumeId, options);
    return Buffer.from(JSON.stringify(json, null, 2));
  }

  private toJsonResume(resume: any): JsonResume {
    return {
      $schema:
        'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
      basics: {
        name: resume.user?.name || '',
        label: resume.titleEn || '',
        email: resume.user?.email,
        phone: resume.user?.phone,
        summary: resume.summaryEn,
      },
      work: (resume.experiences || []).map((exp: any) => ({
        company: exp.companyEn || exp.company,
        position: exp.titleEn || exp.title,
        startDate: this.formatDate(exp.startDate),
        endDate: exp.isPresent ? undefined : this.formatDate(exp.endDate),
        summary: exp.descriptionEn || exp.description,
        highlights: exp.achievements || [],
      })),
      education: (resume.education || []).map((edu: any) => ({
        institution: edu.institutionEn || edu.institution,
        studyType: edu.degreeEn || edu.degree,
        startDate: this.formatDate(edu.startDate),
        endDate: this.formatDate(edu.endDate),
        area: edu.fieldOfStudyEn || edu.fieldOfStudy,
      })),
      skills: (resume.skills || []).map((skill: any) => ({
        name: skill.nameEn || skill.name,
        level: this.mapSkillLevel(skill.level),
        keywords: skill.keywords || [],
      })),
      languages: (resume.languages || []).map((lang: any) => ({
        language: lang.nameEn || lang.name,
        fluency: this.mapLanguageFluency(lang.proficiency),
      })),
      projects: (resume.openSource || []).map((contrib: any) => ({
        name: contrib.projectName,
        description: contrib.description || '',
        url: contrib.repoUrl,
      })),
    };
  }

  private toProfileFormat(resume: any): ProfileFormat {
    return {
      format: 'profile',
      version: '1.0',
      resume: {
        id: resume.id,
        title: resume.titleEn,
        slug: resume.slug,
        user: {
          name: resume.user?.name,
          email: resume.user?.email,
        },
        experiences: resume.experiences,
        education: resume.education,
        skills: resume.skills,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
      },
    };
  }

  private formatDate(date: Date | null | undefined): string {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  }

  private mapSkillLevel(level: string): string {
    const mapping: Record<string, string> = {
      BEGINNER: 'Beginner',
      INTERMEDIATE: 'Intermediate',
      ADVANCED: 'Advanced',
      EXPERT: 'Expert',
    };
    return mapping[level] || level;
  }

  private mapLanguageFluency(proficiency: string): string {
    const mapping: Record<string, string> = {
      NATIVE: 'Native speaker',
      FLUENT: 'Fluent',
      ADVANCED: 'Advanced',
      INTERMEDIATE: 'Intermediate',
      BASIC: 'Basic',
    };
    return mapping[proficiency] || proficiency;
  }
}
