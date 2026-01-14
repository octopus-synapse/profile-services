import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface LatexExportOptions {
  template?: 'simple' | 'moderncv';
  language?: 'en' | 'pt';
}

type ResumeWithRelations = Prisma.ResumeGetPayload<{
  include: {
    user: true;
    experiences: true;
    education: true;
    skills: true;
  };
}>;

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

    const template = options.template ?? 'simple';

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

  private generateSimpleTemplate(resume: ResumeWithRelations): string {
    const name = this.escapeLatex(resume.user?.name ?? 'Unknown');
    const email = this.escapeLatex(resume.user?.email ?? '');
    const phone = this.escapeLatex(resume.user?.phone ?? '');
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

    // Experience Section
    if (resume.experiences.length > 0) {
      latex += `\\section*{Experience}
`;
      for (const exp of resume.experiences) {
        const position = this.escapeLatex(exp.position);
        const company = this.escapeLatex(exp.company);
        const startDate = this.formatDate(exp.startDate);
        const endDate = exp.isCurrent
          ? 'Present'
          : this.formatDate(exp.endDate);
        const description = this.escapeLatex(exp.description ?? '');

        latex += `\\textbf{${position}} \\hfill ${startDate} -- ${endDate}\\\\
\\textit{${company}}\\\\
${description}\\\\[0.5em]
`;
      }
    }

    // Education Section
    if (resume.education.length > 0) {
      latex += `
\\section*{Education}
`;
      for (const edu of resume.education) {
        const degree = this.escapeLatex(edu.degree);
        const institution = this.escapeLatex(edu.institution);
        const startDate = this.formatDate(edu.startDate);
        const endDate = this.formatDate(edu.endDate);

        latex += `\\textbf{${degree}} \\hfill ${startDate} -- ${endDate}\\\\
\\textit{${institution}}\\\\[0.5em]
`;
      }
    }

    // Skills Section
    if (resume.skills.length > 0) {
      latex += `
\\section*{Skills}
`;
      const skillNames = resume.skills
        .map((s) => this.escapeLatex(s.name))
        .join(', ');
      latex += `${skillNames}\\\\
`;
    }

    latex += `
\\end{document}
`;

    return latex;
  }

  private generateModerncvTemplate(resume: ResumeWithRelations): string {
    const name = this.escapeLatex(resume.user?.name ?? 'Unknown');
    const email = this.escapeLatex(resume.user?.email ?? '');
    const title = this.escapeLatex(resume.jobTitle ?? resume.title ?? '');

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
    if (resume.experiences.length > 0) {
      latex += `\\section{Experience}
`;
      for (const exp of resume.experiences) {
        const position = this.escapeLatex(exp.position);
        const company = this.escapeLatex(exp.company);
        const startDate = this.formatDate(exp.startDate);
        const endDate = exp.isCurrent
          ? 'Present'
          : this.formatDate(exp.endDate);
        const description = this.escapeLatex(exp.description ?? '');

        latex += `\\cventry{${startDate}--${endDate}}{${position}}{${company}}{}{}{${description}}
`;
      }
    }

    // Education Section
    if (resume.education.length > 0) {
      latex += `
\\section{Education}
`;
      for (const edu of resume.education) {
        const degree = this.escapeLatex(edu.degree);
        const institution = this.escapeLatex(edu.institution);
        const startDate = this.formatDate(edu.startDate);
        const endDate = this.formatDate(edu.endDate);

        latex += `\\cventry{${startDate}--${endDate}}{${degree}}{${institution}}{}{}{}
`;
      }
    }

    // Skills Section
    if (resume.skills.length > 0) {
      latex += `
\\section{Skills}
`;
      const skillNames = resume.skills
        .map((s) => this.escapeLatex(s.name))
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
