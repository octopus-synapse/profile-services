/**
 * DOCX Education Builder
 * Builds education section paragraphs for DOCX export
 */

import { Paragraph, TextRun } from 'docx';
import { DocxEducation } from '../services/docx.types';

export class DocxEducationBuilder {
  create(edu: DocxEducation): Paragraph[] {
    const { startDate, endDate } = this.formatDateRange(edu);

    return [
      this.createDegreeParagraph(edu),
      this.createInstitutionParagraph(edu.institution, startDate, endDate),
    ];
  }

  private formatDateRange(edu: DocxEducation): {
    startDate: string;
    endDate: string;
  } {
    const startDate = edu.startDate
      ? new Date(edu.startDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
        })
      : '';
    const endDate = edu.endDate
      ? new Date(edu.endDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
        })
      : 'Present';

    return { startDate, endDate };
  }

  private createDegreeParagraph(edu: DocxEducation): Paragraph {
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
