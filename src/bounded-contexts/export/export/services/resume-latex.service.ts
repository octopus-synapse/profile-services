import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  type SectionInput,
  SectionProjectionAdapter,
} from '@/shared-kernel/types/section-projection.adapter';

export interface LatexExportOptions {
  template?: 'simple' | 'moderncv';
  language?: 'en' | 'pt';
}

type LatexResumeData = {
  title: string | null;
  fullName: string | null;
  emailContact: string | null;
  phone: string | null;
  jobTitle: string | null;
  user: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  sections: SectionInput[];
};

@Injectable()
export class ResumeLatexService {
  constructor(private readonly prisma: PrismaService) {}

  async exportAsLatex(resumeId: string, options: LatexExportOptions = {}): Promise<string> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        user: true,
        resumeSections: {
          include: {
            sectionType: {
              select: {
                semanticKind: true,
              },
            },
            items: {
              orderBy: { order: 'asc' },
              select: {
                content: true,
              },
            },
          },
        },
      },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    const latexData: LatexResumeData = {
      title: resume.title,
      fullName: resume.fullName,
      emailContact: resume.emailContact,
      phone: resume.phone,
      jobTitle: resume.jobTitle,
      user: resume.user,
      sections: SectionProjectionAdapter.toGenericSections(
        resume.resumeSections as unknown as Array<{
          sectionType: { semanticKind: string };
          items: Array<{ content: unknown }>;
        }>,
      ),
    };

    const template = options.template ?? 'simple';

    if (template === 'moderncv') {
      return this.generateModerncvTemplate(latexData);
    }

    return this.generateSimpleTemplate(latexData);
  }

  async exportAsBuffer(resumeId: string, options: LatexExportOptions = {}): Promise<Buffer> {
    const latex = await this.exportAsLatex(resumeId, options);
    return Buffer.from(latex);
  }

  private generateSimpleTemplate(resume: LatexResumeData): string {
    const name = this.escapeLatex(resume.user.name ?? resume.fullName ?? 'Unknown');
    const email = this.escapeLatex(resume.user.email ?? resume.emailContact ?? '');
    const phone = this.escapeLatex(resume.user.phone ?? resume.phone ?? '');
    const title = this.escapeLatex(resume.jobTitle ?? resume.title ?? '');

    const experiences = SectionProjectionAdapter.projectExperience(resume.sections);
    const education = SectionProjectionAdapter.projectEducation(resume.sections);
    const skills = SectionProjectionAdapter.projectSkills(resume.sections);
    const projects = SectionProjectionAdapter.projectProjects(resume.sections);
    const languages = SectionProjectionAdapter.projectLanguages(resume.sections);

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
    if (experiences.length > 0) {
      latex += `\\section*{Experience}
`;
      for (const exp of experiences) {
        const position = this.escapeLatex(exp.role);
        const company = this.escapeLatex(exp.company);
        const startDate = this.formatDate(exp.startDate);
        const endDate = exp.isCurrent ? 'Present' : this.formatDate(exp.endDate);
        const description = this.escapeLatex(exp.description ?? '');

        latex += `\\textbf{${position}} \\hfill ${startDate} -- ${endDate}\\\\
\\textit{${company}}\\\\
${description}\\\\[0.5em]
`;
      }
    }

    // Education Section
    if (education.length > 0) {
      latex += `
\\section*{Education}
`;
      for (const edu of education) {
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
    if (skills.length > 0) {
      latex += `
\\section*{Skills}
`;
      const skillNames = skills.map((s) => this.escapeLatex(s.name)).join(', ');
      latex += `${skillNames}\\\\
`;
    }

    // Projects Section
    if (projects.length > 0) {
      latex += `
\\section*{Projects}
`;
      for (const project of projects) {
        const name = this.escapeLatex(project.name);
        const description = this.escapeLatex(project.description ?? '');
        latex += `\\textbf{${name}}\\
${description}\\[0.5em]
`;
      }
    }

    // Languages Section
    if (languages.length > 0) {
      latex += `
\\section*{Languages}
`;
      const languageNames = languages
        .map((language) =>
          this.escapeLatex(language.level ? `${language.name} (${language.level})` : language.name),
        )
        .join(', ');
      latex += `${languageNames}\\
`;
    }

    latex += `
\\end{document}
`;

    return latex;
  }

  private generateModerncvTemplate(resume: LatexResumeData): string {
    const name = this.escapeLatex(resume.user.name ?? resume.fullName ?? 'Unknown');
    const email = this.escapeLatex(resume.user.email ?? resume.emailContact ?? '');
    const title = this.escapeLatex(resume.jobTitle ?? resume.title ?? '');

    const experiences = SectionProjectionAdapter.projectExperience(resume.sections);
    const education = SectionProjectionAdapter.projectEducation(resume.sections);
    const skills = SectionProjectionAdapter.projectSkills(resume.sections);
    const projects = SectionProjectionAdapter.projectProjects(resume.sections);
    const languages = SectionProjectionAdapter.projectLanguages(resume.sections);

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
    if (experiences.length > 0) {
      latex += `\\section{Experience}
`;
      for (const exp of experiences) {
        const position = this.escapeLatex(exp.role);
        const company = this.escapeLatex(exp.company);
        const startDate = this.formatDate(exp.startDate);
        const endDate = exp.isCurrent ? 'Present' : this.formatDate(exp.endDate);
        const description = this.escapeLatex(exp.description ?? '');

        latex += `\\cventry{${startDate}--${endDate}}{${position}}{${company}}{}{}{${description}}
`;
      }
    }

    // Education Section
    if (education.length > 0) {
      latex += `
\\section{Education}
`;
      for (const edu of education) {
        const degree = this.escapeLatex(edu.degree);
        const institution = this.escapeLatex(edu.institution);
        const startDate = this.formatDate(edu.startDate);
        const endDate = this.formatDate(edu.endDate);

        latex += `\\cventry{${startDate}--${endDate}}{${degree}}{${institution}}{}{}{}
`;
      }
    }

    // Skills Section
    if (skills.length > 0) {
      latex += `
\\section{Skills}
`;
      const skillNames = skills.map((s) => this.escapeLatex(s.name)).join(', ');
      latex += `\\cvitem{Technical}{${skillNames}}
`;
    }

    // Projects Section
    if (projects.length > 0) {
      latex += `
\\section{Projects}
`;
      for (const project of projects) {
        const name = this.escapeLatex(project.name);
        const description = this.escapeLatex(project.description ?? '');
        latex += `\\cvitem{${name}}{${description}}
`;
      }
    }

    // Languages Section
    if (languages.length > 0) {
      latex += `
\\section{Languages}
`;
      const languageNames = languages
        .map((language) =>
          this.escapeLatex(language.level ? `${language.name} (${language.level})` : language.name),
        )
        .join(', ');
      latex += `\\cvitem{Spoken}{${languageNames}}
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
