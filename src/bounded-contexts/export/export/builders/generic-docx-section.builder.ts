/**
 * Generic DOCX Section Builder
 *
 * Builds DOCX paragraphs for any section type based on definition.export.docx config.
 * No hardcoded section knowledge - all rendering rules come from SectionType definitions.
 *
 * Milestone 5 - Issue #34
 */

import { Injectable } from '@nestjs/common';
import { Paragraph, TextRun } from 'docx';
import type { DocxExportConfig } from '@/shared-kernel/dtos/semantic-sections.dto';

/**
 * Generic section item content - JSON object with any fields
 */
export type GenericSectionItemContent = Record<string, unknown>;

/**
 * Section rendering context with definition-driven config
 */
export interface SectionRenderContext {
  semanticKind: string;
  sectionKey: string;
  config: DocxExportConfig;
}

@Injectable()
export class GenericDocxSectionBuilder {
  /**
   * Build DOCX paragraphs for a section item using definition-driven config.
   */
  buildItem(content: GenericSectionItemContent, context: SectionRenderContext): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    const config = context.config;

    // Title line (bold)
    if (config.titleField) {
      const titleValue = this.getFieldValue(content, config.titleField);
      const subtitleValue = config.subtitleField
        ? this.getFieldValue(content, config.subtitleField)
        : null;

      paragraphs.push(this.createTitleParagraph(titleValue, subtitleValue));
    }

    // Date range line (italic, gray)
    if (config.dateFields && config.dateFields.length > 0) {
      paragraphs.push(this.createDateRangeParagraph(content, config.dateFields));
    }

    // Description (bullet point)
    if (config.descriptionField) {
      const description = this.getFieldValue(content, config.descriptionField);
      if (description) {
        paragraphs.push(this.createDescriptionParagraph(description));
      }
    }

    // List fields (bullet points)
    if (config.listFields && config.listFields.length > 0) {
      for (const listField of config.listFields) {
        const listValue = content[listField];
        if (Array.isArray(listValue)) {
          paragraphs.push(...this.createListParagraphs(listValue));
        }
      }
    }

    return paragraphs;
  }

  /**
   * Build DOCX paragraphs for all items in a section.
   */
  buildSection(items: GenericSectionItemContent[], context: SectionRenderContext): Paragraph[] {
    return items.flatMap((item) => this.buildItem(item, context));
  }

  private getFieldValue(content: GenericSectionItemContent, fieldPath: string): string {
    const value = content[fieldPath];
    if (typeof value === 'string') {
      return value;
    }
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }

  private createTitleParagraph(title: string, subtitle: string | null): Paragraph {
    const children: TextRun[] = [new TextRun({ text: title, bold: true })];

    if (subtitle) {
      children.push(new TextRun({ text: ` at ${subtitle}`, bold: true }));
    }

    return new Paragraph({
      children,
      spacing: { after: 50 },
    });
  }

  private createDateRangeParagraph(
    content: GenericSectionItemContent,
    dateFields: string[],
  ): Paragraph {
    const [startField, endField] = dateFields;
    const startDate = this.formatDate(content[startField]);
    const endDate = endField ? (this.formatDate(content[endField]) ?? 'Present') : '';

    const dateText = endField ? `${startDate} - ${endDate}` : startDate;

    return new Paragraph({
      children: [
        new TextRun({
          text: dateText,
          italics: true,
          color: '595959',
        }),
      ],
      spacing: { after: 100 },
    });
  }

  private formatDate(value: unknown): string {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      try {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
          });
        }
      } catch {
        // Not a valid date, return as-is
      }
      return value;
    }

    return String(value);
  }

  private createDescriptionParagraph(description: string): Paragraph {
    return new Paragraph({
      text: description,
      bullet: { level: 0 },
      indent: { left: 720 },
      spacing: { after: 200 },
    });
  }

  private createListParagraphs(items: unknown[]): Paragraph[] {
    return items
      .filter((item) => item !== null && item !== undefined)
      .map(
        (item) =>
          new Paragraph({
            text: String(item),
            bullet: { level: 1 },
            indent: { left: 1080 },
            spacing: { after: 100 },
          }),
      );
  }
}
