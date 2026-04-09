/**
 * DOCX Builder Service
 *
 * Definition-driven DOCX document generation.
 * No hardcoded section knowledge - rendering rules come from SectionType definitions.
 *
 * Milestone 5 - Issue #39
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { Document, Packer } from 'docx';
import { UsersRepository } from '@/bounded-contexts/identity/users';
import { ResumesRepository } from '@/bounded-contexts/resumes/resumes/resumes.repository';
import { SectionTypeRepository } from '@/bounded-contexts/resumes/shared-kernel/infrastructure/repositories';
import { ERROR_MESSAGES } from '@/shared-kernel';
import type { DocxUserData } from './docx.types';
import type { GenericResumeSectionData } from './docx-sections.service';
import { DocxSectionsService } from './docx-sections.service';
import { DocxStylesService } from './docx-styles.service';

type ResumeSectionWithItems = {
  sectionType: {
    key: string;
    semanticKind: string;
    title: string;
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
    private readonly sectionTypeRepo: SectionTypeRepository,
  ) {}

  /**
   * Generate DOCX document for user resume - DEFINITION-DRIVEN
   */
  async generate(userId: string): Promise<Buffer> {
    const { user, resume } = await this.loadUserAndResume(userId);
    const normalizedUser = this.normalizeUser(user);
    const genericSections = this.extractGenericSections(resume);

    const doc = new Document({
      sections: [this.sectionsService.createMainSection(normalizedUser, genericSections)],
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

    const resume: ResumeWithSections = {
      resumeSections: ('resumeSections' in resumeData && Array.isArray(resumeData.resumeSections)
        ? resumeData.resumeSections
        : []
      ).map((section: Record<string, unknown>) => ({
        sectionType: section.sectionType as ResumeSectionWithItems['sectionType'],
        items: Array.isArray(section.items) ? (section.items as Array<{ content: unknown }>) : [],
      })),
    };
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

  /**
   * Extract generic sections from resume - NO TYPE-SPECIFIC PROJECTION
   */
  private extractGenericSections(resume: ResumeWithSections): GenericResumeSectionData[] {
    const sections: GenericResumeSectionData[] = [];

    // Sort sections by recommended position from definitions
    const sortedResumeSections = [...resume.resumeSections].sort((a, b) => {
      const aType = this.sectionTypeRepo.getByKey(a.sectionType.key);
      const bType = this.sectionTypeRepo.getByKey(b.sectionType.key);
      const aPos = aType?.definition.ats?.recommendedPosition ?? 99;
      const bPos = bType?.definition.ats?.recommendedPosition ?? 99;
      return aPos - bPos;
    });

    for (const resumeSection of sortedResumeSections) {
      const items = resumeSection.items.map((item) => item.content as Record<string, unknown>);

      sections.push({
        semanticKind: resumeSection.sectionType.semanticKind,
        sectionTypeKey: resumeSection.sectionType.key,
        title: resumeSection.sectionType.title,
        items,
      });
    }

    return sections;
  }
}
