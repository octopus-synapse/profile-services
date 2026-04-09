/**
 * Export LaTeX Use Case
 *
 * Exports resume data as LaTeX document.
 * Definition-driven - field extraction done generically from section item content.
 */

import { NotFoundException } from '@nestjs/common';
import type {
  GenericSectionContent,
  GenericSectionWithMeta,
  ResumeDataRepositoryPort,
  ResumeForLatexExport,
} from '../../../domain/ports/resume-data.repository.port';
import type { SectionOrderingPort } from '../../../domain/ports/section-ordering.port';

// ============================================================================
// DTOs & Types
// ============================================================================

export interface ExportLatexDto {
  resumeId: string;
  template?: 'simple' | 'moderncv';
  language?: 'en' | 'pt';
}

// ============================================================================
// Use Case
// ============================================================================

export class ExportLatexUseCase {
  constructor(
    private readonly resumeDataRepository: ResumeDataRepositoryPort,
    private readonly sectionOrdering?: SectionOrderingPort,
  ) {}

  async execute(dto: ExportLatexDto): Promise<string> {
    const resume = await this.resumeDataRepository.findForLatexExport(dto.resumeId);

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    // Sort sections by recommended position
    if (this.sectionOrdering) {
      resume.sections.sort((a, b) => {
        const aPos = this.sectionOrdering?.getRecommendedPosition(a.sectionTypeKey) ?? 0;
        const bPos = this.sectionOrdering?.getRecommendedPosition(b.sectionTypeKey) ?? 0;
        return aPos - bPos;
      });
    }

    const template = dto.template ?? 'simple';

    if (template === 'moderncv') {
      return this.generateModerncvTemplate(resume);
    }

    return this.generateSimpleTemplate(resume);
  }

  async executeAsBuffer(dto: ExportLatexDto): Promise<Buffer> {
    const latex = await this.execute(dto);
    return Buffer.from(latex);
  }

  private generateSimpleTemplate(resume: ResumeForLatexExport): string {
    const name = this.escapeLatex(resume.user.name ?? resume.fullName ?? 'Unknown');
    const email = this.escapeLatex(resume.user.email ?? resume.emailContact ?? '');
    const phone = this.escapeLatex(resume.user.phone ?? resume.phone ?? '');
    const title = this.escapeLatex(resume.jobTitle ?? resume.title ?? '');

    let latex = `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\usepackage{hyperref}
\\usepackage{enumitem}

\\geometry{margin=1in}

\\begin{document}

% Header
\\begin{center}
{\\LARGE \\textbf{${name}}}\\\\[0.3em]
{\\large ${title}}\\\\[0.5em]
${email}${phone ? ` \\textbar{} ${phone}` : ''}
\\end{center}

\\vspace{1em}
`;

    // Render each section generically
    for (const section of resume.sections) {
      if (section.items.length === 0) continue;
      latex += this.renderSimpleSection(section);
    }

    latex += `
\\end{document}
`;

    return latex;
  }

  /**
   * Render a section in simple template format.
   * Uses generic field extraction - no hardcoded field names.
   */
  private renderSimpleSection(section: GenericSectionWithMeta): string {
    let latex = `\\section*{${this.escapeLatex(section.title)}}
`;

    for (const item of section.items) {
      // Extract common fields dynamically
      const titleField = this.extractField(item, ['role', 'position', 'degree', 'name', 'title']);
      const subtitleField = this.extractField(item, ['company', 'institution', 'organization']);
      const startDate = this.formatDate(item.startDate as Date | null);
      const endDate = item.isCurrent ? 'Present' : this.formatDate(item.endDate as Date | null);
      const description = this.escapeLatex(
        this.extractField(item, ['description', 'summary', 'details']) ?? '',
      );

      if (titleField) {
        latex += `\\textbf{${this.escapeLatex(titleField)}}`;
        if (startDate || endDate) {
          latex += ` \\hfill ${startDate}${endDate ? ` -- ${endDate}` : ''}`;
        }
        latex += `\\\\
`;
      }

      if (subtitleField) {
        latex += `\\textit{${this.escapeLatex(subtitleField)}}\\\\
`;
      }

      if (description) {
        latex += `${description}\\\\[0.5em]
`;
      } else if (!titleField && !subtitleField) {
        // For simple items like skills/languages, render as list
        const itemName = this.extractField(item, ['name', 'skill', 'language']);
        const level = this.extractField(item, ['level', 'proficiency']);
        if (itemName) {
          latex += `${this.escapeLatex(itemName)}${level ? ` (${this.escapeLatex(level)})` : ''}, `;
        }
      }
    }

    return `${latex}\n`;
  }

  private generateModerncvTemplate(resume: ResumeForLatexExport): string {
    const name = this.escapeLatex(resume.user.name ?? resume.fullName ?? 'Unknown');
    const email = this.escapeLatex(resume.user.email ?? resume.emailContact ?? '');
    const title = this.escapeLatex(resume.jobTitle ?? resume.title ?? '');
    const nameParts = name.split(' ');

    let latex = `\\documentclass[11pt,a4paper,sans]{moderncv}
\\moderncvstyle{classic}
\\moderncvcolor{blue}

\\usepackage[utf8]{inputenc}
\\usepackage[scale=0.75]{geometry}

\\name{${nameParts[0]}}{${nameParts.slice(1).join(' ')}}
\\title{${title}}
\\email{${email}}

\\begin{document}
\\makecvtitle

`;

    // Render each section generically
    for (const section of resume.sections) {
      if (section.items.length === 0) continue;
      latex += this.renderModerncvSection(section);
    }

    latex += `
\\end{document}
`;

    return latex;
  }

  /**
   * Render a section in moderncv format.
   */
  private renderModerncvSection(section: GenericSectionWithMeta): string {
    let latex = `\\section{${this.escapeLatex(section.title)}}
`;

    for (const item of section.items) {
      const titleField = this.extractField(item, ['role', 'position', 'degree', 'name', 'title']);
      const subtitleField = this.extractField(item, ['company', 'institution', 'organization']);
      const startDate = this.formatDate(item.startDate as Date | null);
      const endDate = item.isCurrent ? 'Present' : this.formatDate(item.endDate as Date | null);
      const description = this.escapeLatex(
        this.extractField(item, ['description', 'summary', 'details']) ?? '',
      );

      if (titleField && subtitleField) {
        // Entry format for experience/education style items
        latex += `\\cventry{${startDate}--${endDate}}{${this.escapeLatex(titleField)}}{${this.escapeLatex(subtitleField)}}{}{}{${description}}
`;
      } else if (titleField) {
        // Item format for simpler entries
        latex += `\\cvitem{${this.escapeLatex(titleField)}}{${description}}
`;
      } else {
        // List item
        const itemName = this.extractField(item, ['name', 'skill', 'language']);
        const level = this.extractField(item, ['level', 'proficiency']);
        if (itemName) {
          latex += `\\cvitem{}{${this.escapeLatex(itemName)}${level ? ` (${this.escapeLatex(level)})` : ''}}
`;
        }
      }
    }

    return `${latex}\n`;
  }

  /**
   * Extract field from content using a priority list of field names.
   */
  private extractField(content: GenericSectionContent, fieldNames: string[]): string | null {
    for (const field of fieldNames) {
      const value = content[field];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }
    return null;
  }

  private escapeLatex(text: string): string {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/&/g, '\\&')
      .replace(/%/g, '\\%')
      .replace(/\$/g, '\\$')
      .replace(/#/g, '\\#')
      .replace(/_/g, '\\_')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/~/g, '\\textasciitilde{}')
      .replace(/\^/g, '\\textasciicircum{}');
  }

  private formatDate(date: Date | null | undefined): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(d.getTime())) return '';
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    return `${month} ${year}`;
  }
}
