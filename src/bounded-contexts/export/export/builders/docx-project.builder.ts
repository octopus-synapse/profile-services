/**
 * DOCX Project Builder
 * Builds project section paragraphs for DOCX export
 */

import { Project } from '@prisma/client';
import { Paragraph, TextRun } from 'docx';

export class DocxProjectBuilder {
  create(proj: Project): Paragraph[] {
    return [this.createTitleParagraph(proj), this.createDescriptionParagraph(proj.description)];
  }

  private createTitleParagraph(proj: Project): Paragraph {
    return new Paragraph({
      children: [
        new TextRun({ text: proj.name, bold: true }),
        ...(proj.url ? [new TextRun({ text: ` - ${proj.url}`, style: 'Hyperlink' })] : []),
      ],
      spacing: { after: 50 },
    });
  }

  private createDescriptionParagraph(description: string | null): Paragraph {
    return new Paragraph({
      text: description ?? '',
      bullet: { level: 0 },
      indent: { left: 720 },
      spacing: { after: 200 },
    });
  }
}
