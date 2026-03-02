/**
 * DOCX Builder Service
 * Orchestrates DOCX document generation
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { Document, Packer } from 'docx';
import { UsersRepository } from '@/bounded-contexts/identity/users/users.repository';
import { ResumesRepository } from '@/bounded-contexts/resumes/resumes/resumes.repository';
import { ERROR_MESSAGES } from '@/shared-kernel';
import { SectionProjectionAdapter } from '@/shared-kernel/types/section-projection.adapter';
import { DocxResumeData, DocxUserData } from './docx.types';
import { DocxSectionsService } from './docx-sections.service';
import { DocxStylesService } from './docx-styles.service';

type ResumeSectionWithItems = {
  sectionType: {
    semanticKind: string;
  };
  items: Array<{
    content: unknown;
  }>;
};

type ResumeWithSections = {
  resumeSections: ResumeSectionWithItems[];
};

@Injectable()
export class DocxBuilderService {
  constructor(
    private readonly resumesRepository: ResumesRepository,
    private readonly usersRepository: UsersRepository,
    private readonly sectionsService: DocxSectionsService,
    private readonly stylesService: DocxStylesService,
  ) {}

  /**
   * Generate DOCX document for user resume
   */
  async generate(userId: string): Promise<Buffer> {
    const { user, resume } = await this.loadUserAndResume(userId);
    const normalizedResume = this.normalizeResume(resume);
    const normalizedUser = this.normalizeUser(user);

    const doc = new Document({
      sections: [this.sectionsService.createMainSection(normalizedUser, normalizedResume)],
      styles: this.stylesService.getDocumentStyles(),
    });

    return Packer.toBuffer(doc);
  }

  /**
   * Load user and resume data
   */
  private async loadUserAndResume(userId: string) {
    const user = await this.usersRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const resumeData = await this.resumesRepository.findResumeByUserId(userId);
    if (!resumeData) {
      throw new NotFoundException(ERROR_MESSAGES.RESUME_NOT_FOUND_FOR_USER);
    }

    const resume = resumeData as unknown as ResumeWithSections;
    return { user, resume };
  }

  private normalizeUser(user: Record<string, unknown>): DocxUserData {
    return {
      name: typeof user.name === 'string' ? user.name : null,
      displayName:
        typeof user.displayName === 'string'
          ? user.displayName
          : typeof user.name === 'string'
            ? user.name
            : null,
      bio: typeof user.bio === 'string' ? user.bio : null,
      email: typeof user.email === 'string' ? user.email : null,
      phone: typeof user.phone === 'string' ? user.phone : null,
      location: typeof user.location === 'string' ? user.location : null,
      linkedin: typeof user.linkedin === 'string' ? user.linkedin : null,
      github: typeof user.github === 'string' ? user.github : null,
      website: typeof user.website === 'string' ? user.website : null,
    };
  }

  private normalizeResume(resume: ResumeWithSections): DocxResumeData {
    const genericSections = SectionProjectionAdapter.toGenericSections(
      resume.resumeSections as Array<{
        sectionType: { semanticKind: string };
        items: Array<{ content: unknown }>;
      }>,
    );

    const experiences = SectionProjectionAdapter.projectExperience(genericSections);
    const educationItems = SectionProjectionAdapter.projectEducation(genericSections);
    const skills = SectionProjectionAdapter.projectSkills(genericSections);
    const projects = SectionProjectionAdapter.projectProjects(genericSections);
    const languages = SectionProjectionAdapter.projectLanguages(genericSections);

    return {
      experiences: experiences.map((exp) => ({
        position: exp.role,
        company: exp.company,
        startDate: exp.startDate,
        endDate: exp.endDate,
        location: exp.location ?? null,
        description: exp.description ?? null,
      })),
      education: educationItems.map((edu) => ({
        degree: edu.degree,
        field: edu.field ?? '',
        institution: edu.institution,
        startDate: edu.startDate,
        endDate: edu.endDate,
      })),
      skills: skills.map((s) => ({ name: s.name })),
      projects: projects.map((proj) => ({
        name: proj.name,
        description: proj.description ?? null,
        url: proj.url ?? null,
      })),
      languages: languages.map((lang) => ({
        name: lang.name,
        level: lang.level ?? null,
      })),
    };
  }
}
