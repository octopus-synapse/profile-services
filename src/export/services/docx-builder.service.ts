/**
 * DOCX Builder Service
 * Orchestrates DOCX document generation
 */

import { Injectable } from '@nestjs/common';
import { Document, Packer } from 'docx';
import { ResumesRepository } from '../../resumes/resumes.repository';
import { UsersRepository } from '../../users/users.repository';
import {
  ResumeNotFoundError,
  UserNotFoundError,
} from '@octopus-synapse/profile-contracts';
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
    const user = await this.usersRepository.findUserById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const resumeData = await this.resumesRepository.findResumeByUserId(userId);
    if (!resumeData) {
      throw new ResumeNotFoundError(userId);
    }

    const resume = resumeData as FullResume;
    return { user, resume };
  }
}
