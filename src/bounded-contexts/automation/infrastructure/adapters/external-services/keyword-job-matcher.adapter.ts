/**
 * Scores a (resume, job description) pair by keyword overlap — the automation
 * BC's `ResumeJobMatcherPort`.
 *
 * This used to wrap the resume-analytics facade. That bounded context is gone
 * (no client ever called it); the one thing automation needed from it was
 * this fifty-line heuristic, so it lives here now, with the catalogue it
 * matches against. Same algorithm, same numbers: the share of catalogue
 * keywords present in the job text that also appear in the resume text.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  ResumeJobMatcherPort,
  type ResumeJobMatchScore,
} from '../../../domain/ports/resume-job-matcher.port';

/** Flat, de-duplicated catalogue of the terms the overlap is measured on. */
const KEYWORD_CATALOGUE: readonly string[] = [
  ...new Set([
    // software engineering
    'JavaScript',
    'TypeScript',
    'React',
    'Node.js',
    'Python',
    'Java',
    'AWS',
    'Docker',
    'Kubernetes',
    'CI/CD',
    'Git',
    'REST',
    'GraphQL',
    'SQL',
    'NoSQL',
    'Agile',
    'Scrum',
    'microservices',
    'TDD',
    'API',
    // data science
    'R',
    'Machine Learning',
    'Deep Learning',
    'TensorFlow',
    'PyTorch',
    'Pandas',
    'NumPy',
    'Scikit-learn',
    'Statistics',
    'Data Visualization',
    'Tableau',
    'Power BI',
    'Big Data',
    'Spark',
    'Hadoop',
    // devops
    'Azure',
    'GCP',
    'Terraform',
    'Ansible',
    'Jenkins',
    'Linux',
    'Bash',
    'Monitoring',
    'Prometheus',
    'Grafana',
    'Infrastructure',
    // product
    'Product Strategy',
    'Roadmap',
    'User Research',
    'A/B Testing',
    'Analytics',
    'KPIs',
    'OKRs',
    'Stakeholder Management',
    'Prioritization',
    'User Stories',
    'JIRA',
    'Confluence',
    // design
    'Figma',
    'Sketch',
    'Adobe XD',
    'UI/UX',
    'Wireframing',
    'Prototyping',
    'Design Systems',
    'Responsive Design',
    'Accessibility',
    'Visual Design',
    'Typography',
    // marketing
    'SEO',
    'SEM',
    'Content Marketing',
    'Social Media',
    'Google Analytics',
    'Email Marketing',
    'CRM',
    'HubSpot',
    'Salesforce',
    'PPC',
    'Brand Strategy',
    // finance
    'Financial Analysis',
    'Excel',
    'Bloomberg',
    'Risk Management',
    'Valuation',
    'Financial Modeling',
    'Accounting',
    'Compliance',
    'Investment',
    // healthcare
    'Clinical',
    'Patient Care',
    'HIPAA',
    'EMR',
    'EHR',
    'Healthcare Administration',
    'Medical Terminology',
    'Research',
    // education
    'Curriculum Development',
    'Teaching',
    'Assessment',
    'Learning Management',
    'EdTech',
    'Student Engagement',
    'Classroom Management',
  ]),
];

function extractStrings(content: Record<string, unknown>): string[] {
  const parts: string[] = [];
  for (const value of Object.values(content)) {
    if (typeof value === 'string' && value.trim()) {
      parts.push(value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') parts.push(item);
        else if (typeof item === 'object' && item !== null) {
          parts.push(...extractStrings(item as Record<string, unknown>));
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      parts.push(...extractStrings(value as Record<string, unknown>));
    }
  }
  return parts;
}

/**
 * Whether `text` mentions `term`. Substring for multi-character terms (so
 * "Node.js" matches "node.js/express"); whole-word for the one- and
 * two-letter ones — the catalogue has "R", and as a substring "r" is in
 * nearly every sentence, which made every job look like an R job.
 */
function mentions(text: string, term: string): boolean {
  const needle = term.toLowerCase();
  if (needle.length > 2) return text.includes(needle);
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`).test(text);
}

/** Pure core, exported for the spec. */
export function keywordMatchScore(resumeText: string, jobText: string): number {
  const jobLower = jobText.toLowerCase();
  const jobKeywords = KEYWORD_CATALOGUE.filter((kw) => mentions(jobLower, kw));
  if (jobKeywords.length === 0) return 0;
  const resumeLower = resumeText.toLowerCase();
  const matched = jobKeywords.filter((kw) => mentions(resumeLower, kw));
  return Math.round((matched.length / jobKeywords.length) * 100);
}

export class KeywordJobMatcherAdapter extends ResumeJobMatcherPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async matchJobDescription(
    resumeId: string,
    userId: string,
    jobText: string,
  ): Promise<ResumeJobMatchScore> {
    const resume = await this.prisma.resume.findFirst({
      where: { id: resumeId, userId },
      select: {
        summary: true,
        jobTitle: true,
        resumeSections: {
          select: { items: { orderBy: { order: 'asc' }, select: { content: true } } },
        },
      },
    });
    if (!resume) throw new Error(`Resume ${resumeId} not found for user ${userId}`);

    const parts: string[] = [];
    if (resume.summary) parts.push(resume.summary);
    if (resume.jobTitle) parts.push(resume.jobTitle);
    for (const section of resume.resumeSections) {
      for (const item of section.items) {
        parts.push(...extractStrings((item.content ?? {}) as Record<string, unknown>));
      }
    }
    return { matchScore: keywordMatchScore(parts.join(' '), jobText) };
  }
}
