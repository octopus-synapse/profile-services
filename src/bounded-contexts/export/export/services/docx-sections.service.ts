/**
 * DOCX Sections Service
 * Handles section creation for DOCX exports
 */

import { Injectable } from '@nestjs/common';
import { ISectionOptions, SectionType } from 'docx';
import {
  DocxEducationBuilder,
  DocxExperienceBuilder,
  DocxHeaderBuilder,
  DocxProjectBuilder,
  DocxSkillsBuilder,
} from '../builders';
import { DocxResumeData, DocxUserData } from './docx.types';

@Injectable()
export class DocxSectionsService {
  private readonly headerBuilder = new DocxHeaderBuilder();
  private readonly experienceBuilder = new DocxExperienceBuilder();
  private readonly educationBuilder = new DocxEducationBuilder();
  private readonly projectBuilder = new DocxProjectBuilder();
  private readonly skillsBuilder = new DocxSkillsBuilder();

  /**
   * Create main section with all resume content
   */
  createMainSection(user: DocxUserData, resume: DocxResumeData): ISectionOptions {
    const displayName = user.displayName ?? user.name ?? null;

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
        this.headerBuilder.createTitleParagraph(displayName),
        this.headerBuilder.createContactParagraph(user),
        this.headerBuilder.createLinksParagraph(user),
        this.headerBuilder.createSectionHeading('Summary'),
        this.headerBuilder.createSummaryParagraph(user.bio),
        this.headerBuilder.createSectionHeading('Experience'),
        ...resume.experiences.flatMap((exp) => this.experienceBuilder.create(exp)),
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
}
