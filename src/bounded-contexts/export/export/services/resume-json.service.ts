import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

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

type ResumeWithRelations = Prisma.ResumeGetPayload<{
  include: {
    user: true;
    experiences: true;
    education: true;
    skills: true;
    languages: true;
    openSource: true;
    certifications: true;
  };
}>;

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

  private toJsonResume(resume: ResumeWithRelations): JsonResume {
    return {
      $schema:
        'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
      basics: {
        name: resume.user.name ?? 'Unknown',
        label: resume.jobTitle ?? resume.title ?? 'Professional',
        email: resume.user.email ?? undefined,
        phone: resume.user.phone ?? undefined,
        summary: resume.summary ?? undefined,
      },
      work: resume.experiences.map((exp) => ({
        company: exp.company,
        position: exp.position,
        startDate: this.formatDate(exp.startDate),
        endDate: exp.isCurrent ? undefined : this.formatDate(exp.endDate),
        summary: exp.description ?? undefined,
        highlights: exp.skills,
      })),
      education: resume.education.map((edu) => ({
        institution: edu.institution,
        studyType: edu.degree,
        startDate: this.formatDate(edu.startDate),
        endDate: this.formatDate(edu.endDate),
        area: edu.field,
      })),
      skills: resume.skills.map((skill) => ({
        name: skill.name,
        level: this.mapSkillLevel(skill.level),
        keywords: [],
      })),
      languages: resume.languages.map((lang) => ({
        language: lang.name,
        fluency: this.mapLanguageFluency(lang.level),
      })),
      projects: resume.openSource.map((contrib) => ({
        name: contrib.projectName,
        description: contrib.description ?? '',
        url: contrib.projectUrl,
      })),
    };
  }

  private toProfileFormat(resume: ResumeWithRelations): ProfileFormat {
    return {
      format: 'profile',
      version: '1.0',
      resume: {
        id: resume.id,
        title: resume.title,
        slug: resume.slug,
        user: {
          name: resume.user.name,
          email: resume.user.email,
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

  private mapSkillLevel(level: number | null): string {
    if (level === null) return 'Beginner';
    if (level >= 4) return 'Expert';
    if (level >= 3) return 'Advanced';
    if (level >= 2) return 'Intermediate';
    return 'Beginner';
  }

  private mapLanguageFluency(level: string | null): string {
    const mapping: Record<string, string> = {
      NATIVE: 'Native speaker',
      FLUENT: 'Fluent',
      ADVANCED: 'Advanced',
      INTERMEDIATE: 'Intermediate',
      BASIC: 'Basic',
      native: 'Native speaker',
      fluent: 'Fluent',
      advanced: 'Advanced',
      intermediate: 'Intermediate',
      basic: 'Basic',
    };
    return level ? mapping[level] || level : 'Basic';
  }
}
