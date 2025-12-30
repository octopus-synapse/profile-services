/**
 * DOCX Header Builder
 * Builds document header section for DOCX export
 */

import {
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Header,
  PageNumber,
  BorderStyle,
} from 'docx';

interface UserHeaderData {
  displayName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  linkedin: string | null;
  github: string | null;
  bio: string | null;
}

export class DocxHeaderBuilder {
  createPageHeader(): Header {
    return new Header({
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
    });
  }

  createTitleParagraph(displayName: string | null): Paragraph {
    return new Paragraph({
      text: displayName || 'Unnamed User',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    });
  }

  createContactParagraph(user: UserHeaderData): Paragraph {
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      style: 'default',
      children: [
        new TextRun(user.email || ''),
        ...(user.phone ? [new TextRun(` | ${user.phone}`)] : []),
      ],
    });
  }

  createLinksParagraph(user: UserHeaderData): Paragraph {
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      style: 'default',
      children: [
        ...(user.website ? [new TextRun(user.website)] : []),
        ...(user.linkedin
          ? [new TextRun(`${user.website ? ' | ' : ''}${user.linkedin}`)]
          : []),
        ...(user.github
          ? [
              new TextRun(
                `${user.website || user.linkedin ? ' | ' : ''}${user.github}`,
              ),
            ]
          : []),
      ],
    });
  }

  createSummaryParagraph(bio: string | null): Paragraph {
    return new Paragraph({
      text: bio || '',
      style: 'default',
      thematicBreak: true,
    });
  }

  createSectionHeading(text: string): Paragraph {
    return new Paragraph({
      text,
      heading: HeadingLevel.HEADING_1,
      border: {
        bottom: { color: 'auto', space: 1, size: 6, style: BorderStyle.SINGLE },
      },
      spacing: { after: 200, before: 300 },
    });
  }
}
