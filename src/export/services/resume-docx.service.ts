/**
 * Resume DOCX Service
 * Generates DOCX exports of user resumes
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { Document, Packer, SectionType, ISectionOptions } from 'docx';
import { ResumesRepository } from '../../resumes/resumes.repository';
import { UsersRepository } from '../../users/users.repository';
import { ERROR_MESSAGES } from '../../common/constants/app.constants';
import {
  DocxHeaderBuilder,
  DocxExperienceBuilder,
  DocxEducationBuilder,
  DocxProjectBuilder,
  DocxSkillsBuilder,
} from '../builders';
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
export class ResumeDOCXService {
  private readonly headerBuilder = new DocxHeaderBuilder();
  private readonly experienceBuilder = new DocxExperienceBuilder();
  private readonly educationBuilder = new DocxEducationBuilder();
  private readonly projectBuilder = new DocxProjectBuilder();
  private readonly skillsBuilder = new DocxSkillsBuilder();

  constructor(
    private readonly resumesRepository: ResumesRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async generate(userId: string): Promise<Buffer> {
    const { user, resume } = await this.loadUserAndResume(userId);

    const doc = new Document({
      sections: [this.createMainSection(user, resume)],
      styles: this.getDocumentStyles(),
    });

    return Packer.toBuffer(doc);
  }

  private async loadUserAndResume(userId: string) {
    const user = await this.usersRepository.getUser(userId);
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const resume = (await this.resumesRepository.findByUserId(
      userId,
    )) as FullResume;
    if (!resume) {
      throw new NotFoundException(ERROR_MESSAGES.RESUME_NOT_FOUND_FOR_USER);
    }

    return { user, resume };
  }

  private createMainSection(user: any, resume: FullResume): ISectionOptions {
    return {
      headers: { default: this.headerBuilder.createPageHeader() },
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          margin: {
            top: '0.5in',
            right: '0.5in',
            bottom: '0.5in',
            left: '0.5in',
          },
        },
      },
      children: [
        this.headerBuilder.createTitleParagraph(user.displayName),
        this.headerBuilder.createContactParagraph(user),
        this.headerBuilder.createLinksParagraph(user),
        this.headerBuilder.createSectionHeading('Summary'),
        this.headerBuilder.createSummaryParagraph(user.bio),
        this.headerBuilder.createSectionHeading('Experience'),
        ...resume.experiences.flatMap((exp) =>
          this.experienceBuilder.create(exp),
        ),
        this.headerBuilder.createSectionHeading('Education'),
        ...resume.education.flatMap((edu) => this.educationBuilder.create(edu)),
        this.headerBuilder.createSectionHeading('Skills'),
        this.skillsBuilder.createSkillsParagraph(resume.skills),
        this.headerBuilder.createSectionHeading('Projects'),
        ...resume.projects.flatMap((proj) => this.projectBuilder.create(proj)),
        this.headerBuilder.createSectionHeading('Languages'),
        this.skillsBuilder.createLanguagesParagraph(resume.languages),
      ],
    };
  }

  private getDocumentStyles() {
    return {
      paragraphStyles: [
        {
          id: 'default',
          name: 'Default',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { font: 'Calibri', size: 22 },
        },
      ],
    };
  }
}
