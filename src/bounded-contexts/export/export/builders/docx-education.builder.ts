/**
 * DOCX Education Builder
 * Builds education section paragraphs for DOCX export
 */

import { Paragraph, TextRun } from 'docx';
import { Education } from '@prisma/client';

export class DocxEducationBuilder {
  create(edu: Education): Paragraph[] {
    const { startDate, endDate } = this.formatDateRange(edu);

    return [
      this.createDegreeParagraph(edu),
      this.createInstitutionParagraph(edu.institution, startDate, endDate),
    ];
  }

  private formatDateRange(edu: Education): {
    startDate: string;
    endDate: string;
  } {
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

    return { startDate, endDate };
  }

  private createDegreeParagraph(edu: Education): Paragraph {
    return new Paragraph({
      children: [
        new TextRun({ text: edu.degree, bold: true }),
        new TextRun({ text: ` in ${edu.field}` }),
      ],
      spacing: { after: 50 },
    });
  }

  private createInstitutionParagraph(
    institution: string,
    startDate: string,
    endDate: string,
  ): Paragraph {
    return new Paragraph({
      children: [
        new TextRun({
          text: `${institution} | ${startDate} - ${endDate}`,
          italics: true,
          color: '595959',
        }),
      ],
      spacing: { after: 200 },
    });
  }
}
