/**
 * DOCX Sections Service
 *
 * Definition-driven section rendering for DOCX exports.
 * All section rendering rules come from SectionType.definition.export.docx.
 * No hardcoded section knowledge.
 *
 * Milestone 5 - Issue #39
 */

import { Injectable } from '@nestjs/common';
import type { ISectionOptions } from 'docx';
import { Paragraph, SectionType } from 'docx';
import { SectionTypeRepository } from '@/bounded-contexts/resumes/infrastructure/repositories';
import type { DocxExportConfig } from '@/shared-kernel/schemas/sections';
import { DocxHeaderBuilder } from '../builders';
import type {
  GenericSectionItemContent,
  SectionRenderContext,
} from '../builders/generic-docx-section.builder';
import { GenericDocxSectionBuilder } from '../builders/generic-docx-section.builder';
import type { DocxUserData } from './docx.types';

/**
 * Generic section data for DOCX rendering
 */
export interface GenericResumeSectionData {
  semanticKind: string;
  sectionTypeKey: string;
  title: string;
  items: GenericSectionItemContent[];
}

@Injectable()
export class DocxSectionsService {
  private readonly headerBuilder = new DocxHeaderBuilder();
  private readonly genericBuilder = new GenericDocxSectionBuilder();

  constructor(private readonly sectionTypeRepo: SectionTypeRepository) {}

  /**
   * Create main section with all resume content - DEFINITION-DRIVEN
   */
  createMainSection(user: DocxUserData, sections: GenericResumeSectionData[]): ISectionOptions {
    const displayName = user.displayName ?? user.name ?? null;
    const children: Paragraph[] = [
      this.headerBuilder.createTitleParagraph(displayName),
      this.headerBuilder.createContactParagraph(user),
      this.headerBuilder.createLinksParagraph(user),
    ];

    // Add summary if available
    if (user.bio) {
      children.push(this.headerBuilder.createSectionHeading('Summary'));
      children.push(this.headerBuilder.createSummaryParagraph(user.bio));
    }

    // Render each section using definition-driven config
    for (const section of sections) {
      if (section.items.length === 0) {
        continue;
      }

      const sectionType = this.sectionTypeRepo.getByKey(section.sectionTypeKey);
      const docxConfig = sectionType?.definition.export?.docx;

      // Add section heading
      children.push(this.headerBuilder.createSectionHeading(section.title));

      // If we have DOCX config, use the generic builder
      if (docxConfig) {
        const context: SectionRenderContext = {
          semanticKind: section.semanticKind,
          sectionKey: section.sectionTypeKey,
          config: docxConfig as DocxExportConfig,
        };

        children.push(...this.genericBuilder.buildSection(section.items, context));
      } else {
        // Fallback: render each item as a simple paragraph
        for (const item of section.items) {
          const text = this.extractDisplayText(item);
          if (text) {
            children.push(this.headerBuilder.createSummaryParagraph(text));
          }
        }
      }
    }

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
      children,
    };
  }

  /**
   * Extract a displayable text from a generic section item (fallback)
   */
  private extractDisplayText(item: GenericSectionItemContent): string {
    // Try common field names
    for (const field of ['name', 'title', 'role', 'company', 'description']) {
      const value = item[field];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }
    return '';
  }
}
