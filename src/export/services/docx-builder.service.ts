/**
 * DOCX Builder Service
 * Orchestrates DOCX document generation
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { Document, Packer } from 'docx';
import { ResumesRepository } from '../../resumes/resumes.repository';
import { UsersRepository } from '../../users/users.repository';
import { ERROR_MESSAGES } from '../../common/constants/config';
import { DocxSectionsService } from './docx-sections.service';
import { DocxStylesService } from './docx-styles.service';
import {
  Resume,
  Experience,
  Education,
  Skill,
  Project,
  Language,
} from '@prisma/client';

type FullResume = Resume & {
  experiences: Experience[];
  education: Education[];
  skills: Skill[];
  projects: Project[];
  languages: Language[];
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

    const doc = new Document({
      sections: [this.sectionsService.createMainSection(user, resume)],
      styles: this.stylesService.getDocumentStyles(),
    });

    return Packer.toBuffer(doc);
  }

  /**
   * Load user and resume data
   */
  private async loadUserAndResume(userId: string) {
    const user = await this.usersRepository.getUser(userId);
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const resumeData = await this.resumesRepository.findByUserId(userId);
    if (!resumeData) {
      throw new NotFoundException(ERROR_MESSAGES.RESUME_NOT_FOUND_FOR_USER);
    }

    const resume = resumeData as FullResume;
    return { user, resume };
  }
}
