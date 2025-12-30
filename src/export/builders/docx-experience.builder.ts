/**
 * DOCX Experience Builder
 * Builds experience section paragraphs for DOCX export
 */

import { Paragraph, TextRun } from 'docx';
import { Experience } from '@prisma/client';

export class DocxExperienceBuilder {
  create(exp: Experience): Paragraph[] {
    const { startDate, endDate } = this.formatDateRange(exp);

    return [
      this.createPositionParagraph(exp),
      this.createLocationDateParagraph(exp.location, startDate, endDate),
      this.createDescriptionParagraph(exp.description),
    ];
  }

  private formatDateRange(exp: Experience): {
    startDate: string;
    endDate: string;
  } {
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

    return { startDate, endDate };
  }

  private createPositionParagraph(exp: Experience): Paragraph {
    return new Paragraph({
      children: [
        new TextRun({ text: exp.position, bold: true }),
        new TextRun({ text: ` at ${exp.company}`, bold: true }),
      ],
      spacing: { after: 50 },
    });
  }

  private createLocationDateParagraph(
    location: string | null,
    startDate: string,
    endDate: string,
  ): Paragraph {
    return new Paragraph({
      children: [
        new TextRun({
          text: `${location || ''} | ${startDate} - ${endDate}`,
          italics: true,
          color: '595959',
        }),
      ],
      spacing: { after: 100 },
    });
  }

  private createDescriptionParagraph(description: string | null): Paragraph {
    return new Paragraph({
      text: description || '',
      bullet: { level: 0 },
      indent: { left: 720 },
      spacing: { after: 200 },
    });
  }
}
