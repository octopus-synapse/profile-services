import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface LatexExportOptions {
  template?: 'simple' | 'moderncv';
  language?: 'en' | 'pt';
}

@Injectable()
export class ResumeLatexService {
  constructor(private readonly prisma: PrismaService) {}

  async exportAsLatex(
    resumeId: string,
    options: LatexExportOptions = {},
  ): Promise<string> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        user: true,
        experiences: { orderBy: { startDate: 'desc' } },
        education: { orderBy: { startDate: 'desc' } },
        skills: true,
      },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    const template = options.template || 'simple';

    if (template === 'moderncv') {
      return this.generateModerncvTemplate(resume);
    }

    return this.generateSimpleTemplate(resume);
  }

  async exportAsBuffer(
    resumeId: string,
    options: LatexExportOptions = {},
  ): Promise<Buffer> {
    const latex = await this.exportAsLatex(resumeId, options);
    return Buffer.from(latex);
  }

  private generateSimpleTemplate(resume: any): string {
    const name = this.escapeLatex(resume.user?.name || '');
    const email = this.escapeLatex(resume.user?.email || '');
    const phone = this.escapeLatex(resume.user?.phone || '');
    const title = this.escapeLatex(resume.titleEn || '');

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

    // Experience Section
    if (resume.experiences?.length > 0) {
      latex += `\\section*{Experience}
`;
      for (const exp of resume.experiences) {
        const position = this.escapeLatex(exp.titleEn || exp.title || '');
        const company = this.escapeLatex(exp.companyEn || exp.company || '');
        const startDate = this.formatDate(exp.startDate);
        const endDate = exp.isPresent
          ? 'Present'
          : this.formatDate(exp.endDate);
        const description = this.escapeLatex(
          exp.descriptionEn || exp.description || '',
        );

        latex += `\\textbf{${position}} \\hfill ${startDate} -- ${endDate}\\\\
\\textit{${company}}\\\\
${description}\\\\[0.5em]
`;
      }
    }

    // Education Section
    if (resume.education?.length > 0) {
      latex += `
\\section*{Education}
`;
      for (const edu of resume.education) {
        const degree = this.escapeLatex(edu.degreeEn || edu.degree || '');
        const institution = this.escapeLatex(
          edu.institutionEn || edu.institution || '',
        );
        const startDate = this.formatDate(edu.startDate);
        const endDate = this.formatDate(edu.endDate);

        latex += `\\textbf{${degree}} \\hfill ${startDate} -- ${endDate}\\\\
\\textit{${institution}}\\\\[0.5em]
`;
      }
    }

    // Skills Section
    if (resume.skills?.length > 0) {
      latex += `
\\section*{Skills}
`;
      const skillNames = resume.skills
        .map((s: any) => this.escapeLatex(s.nameEn || s.name))
        .join(', ');
      latex += `${skillNames}\\\\
`;
    }

    latex += `
\\end{document}
`;

    return latex;
  }

  private generateModerncvTemplate(resume: any): string {
    const name = this.escapeLatex(resume.user?.name || '');
    const email = this.escapeLatex(resume.user?.email || '');
    const title = this.escapeLatex(resume.titleEn || '');

    let latex = `\\documentclass[11pt,a4paper,sans]{moderncv}
\\moderncvstyle{classic}
\\moderncvcolor{blue}

\\usepackage[utf8]{inputenc}
\\usepackage[scale=0.75]{geometry}

\\name{${name.split(' ')[0]}}{${name.split(' ').slice(1).join(' ')}}
\\title{${title}}
\\email{${email}}

\\begin{document}
\\makecvtitle

`;

    // Experience Section
    if (resume.experiences?.length > 0) {
      latex += `\\section{Experience}
`;
      for (const exp of resume.experiences) {
        const position = this.escapeLatex(exp.titleEn || '');
        const company = this.escapeLatex(exp.companyEn || '');
        const startDate = this.formatDate(exp.startDate);
        const endDate = exp.isPresent
          ? 'Present'
          : this.formatDate(exp.endDate);
        const description = this.escapeLatex(exp.descriptionEn || '');

        latex += `\\cventry{${startDate}--${endDate}}{${position}}{${company}}{}{}{${description}}
`;
      }
    }

    // Education Section
    if (resume.education?.length > 0) {
      latex += `
\\section{Education}
`;
      for (const edu of resume.education) {
        const degree = this.escapeLatex(edu.degreeEn || '');
        const institution = this.escapeLatex(edu.institutionEn || '');
        const startDate = this.formatDate(edu.startDate);
        const endDate = this.formatDate(edu.endDate);

        latex += `\\cventry{${startDate}--${endDate}}{${degree}}{${institution}}{}{}{}
`;
      }
    }

    // Skills Section
    if (resume.skills?.length > 0) {
      latex += `
\\section{Skills}
`;
      const skillNames = resume.skills
        .map((s: any) => this.escapeLatex(s.nameEn || s.name))
        .join(', ');
      latex += `\\cvitem{Technical}{${skillNames}}
`;
    }

    latex += `
\\end{document}
`;

    return latex;
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
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${month} ${year}`;
  }
}
