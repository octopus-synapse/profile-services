import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  SectionType,
  Header,
  PageNumber,
  BorderStyle,
} from 'docx';
import { ResumesRepository } from '../../resumes/resumes.repository';
import { UsersRepository } from '../../users/users.repository';
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
  constructor(
    private readonly resumesRepository: ResumesRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async generate(userId: string): Promise<Buffer> {
    const user = await this.usersRepository.getUser(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const resume = (await this.resumesRepository.findByUserId(
      userId,
    )) as FullResume;
    if (!resume) {
      throw new NotFoundException('Resume not found for this user');
    }

    const doc = new Document({
      sections: [
        {
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({
                      children: ['Page ', PageNumber.CURRENT],
                      style: 'default',
                    }),
                  ],
                }),
              ],
            }),
          },
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
            // --- Header Section ---
            new Paragraph({
              text: user.displayName || 'Unnamed User',
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              style: 'default',
              children: [
                new TextRun(user.email || ''),
                ...(user.phone ? [new TextRun(` | ${user.phone}`)] : []),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              style: 'default',
              children: [
                ...(user.website ? [new TextRun(user.website)] : []),
                ...(user.linkedin
                  ? [
                      new TextRun(
                        `${user.website ? ' | ' : ''}${user.linkedin}`,
                      ),
                    ]
                  : []),
                ...(user.github
                  ? [
                      new TextRun(
                        `${user.website || user.linkedin ? ' | ' : ''}${user.github}`,
                      ),
                    ]
                  : []),
              ],
            }),

            // --- Summary Section ---
            this.createSectionHeading('Summary'),
            new Paragraph({
              text: user.bio || '',
              style: 'default',
              thematicBreak: true,
            }),

            // --- Experience Section ---
            this.createSectionHeading('Experience'),
            ...resume.experiences.flatMap((exp) => this.createExperience(exp)),

            // --- Education Section ---
            this.createSectionHeading('Education'),
            ...resume.education.flatMap((edu) => this.createEducation(edu)),

            // --- Skills Section ---
            this.createSectionHeading('Skills'),
            this.createSkillsParagraph(resume.skills),

            // --- Projects Section ---
            this.createSectionHeading('Projects'),
            ...resume.projects.flatMap((proj) => this.createProject(proj)),

            // --- Languages Section ---
            this.createSectionHeading('Languages'),
            this.createLanguagesParagraph(resume.languages),
          ],
        },
      ],
      styles: {
        paragraphStyles: [
          {
            id: 'default',
            name: 'Default',
            basedOn: 'Normal',
            next: 'Normal',
            quickFormat: true,
            run: {
              font: 'Calibri',
              size: 22, // 11pt
            },
          },
        ],
      },
    });

    return Packer.toBuffer(doc);
  }

  private createSectionHeading(text: string): Paragraph {
    return new Paragraph({
      text,
      heading: HeadingLevel.HEADING_1,
      border: {
        bottom: { color: 'auto', space: 1, size: 6, style: BorderStyle.SINGLE },
      },
      spacing: { after: 200, before: 300 },
    });
  }

  private createExperience(exp: Experience): Paragraph[] {
    const startDate = new Date(exp.startDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });
    const endDate = exp.endDate
      ? new Date(exp.endDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
        })
      : 'Present';

    return [
      new Paragraph({
        children: [
          new TextRun({ text: exp.position, bold: true }),
          new TextRun({ text: ` at ${exp.company}`, bold: true }),
        ],
        spacing: { after: 50 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `${exp.location} | ${startDate} - ${endDate}`,
            italics: true,
            color: '595959',
          }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: exp.description || '',
        bullet: { level: 0 },
        indent: { left: 720 },
        spacing: { after: 200 },
      }),
    ];
  }

  private createEducation(edu: Education): Paragraph[] {
    const startDate = new Date(edu.startDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });
    const endDate = edu.endDate
      ? new Date(edu.endDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
        })
      : 'Present';

    return [
      new Paragraph({
        children: [
          new TextRun({ text: edu.degree, bold: true }),
          new TextRun({ text: ` in ${edu.field}` }),
        ],
        spacing: { after: 50 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `${edu.institution} | ${startDate} - ${endDate}`,
            italics: true,
            color: '595959',
          }),
        ],
        spacing: { after: 200 },
      }),
    ];
  }

  private createSkillsParagraph(skills: Skill[]): Paragraph {
    return new Paragraph({
      children: skills.map(
        (skill, index) =>
          new TextRun({
            text: `${skill.name}${index < skills.length - 1 ? ' • ' : ''}`,
          }),
      ),
      spacing: { after: 200 },
    });
  }

  private createLanguagesParagraph(languages: Language[]): Paragraph {
    return new Paragraph({
      children: languages.map(
        (lang, index) =>
          new TextRun({
            text: `${lang.name} (${lang.level})${index < languages.length - 1 ? ' | ' : ''}`,
          }),
      ),
      spacing: { after: 200 },
    });
  }

  private createProject(proj: Project): Paragraph[] {
    return [
      new Paragraph({
        children: [
          new TextRun({ text: proj.name, bold: true }),
          ...(proj.url
            ? [new TextRun({ text: ` - ${proj.url}`, style: 'Hyperlink' })]
            : []),
        ],
        spacing: { after: 50 },
      }),
      new Paragraph({
        text: proj.description || '',
        bullet: { level: 0 },
        indent: { left: 720 },
        spacing: { after: 200 },
      }),
    ];
  }
}
