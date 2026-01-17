/**
 * Keyword Analyzer Service
 *
 * Analyzes resume content for industry-relevant keywords.
 * Provides suggestions for missing keywords and job description matching.
 *
 * Extracted from ResumeAnalyticsService as part of god class decomposition.
 * @see ADR-000X — Enforce Disciplined, Persona-Aware Engineering
 */

import { Injectable } from '@nestjs/common';
import type {
  Industry,
  KeywordSuggestions,
  KeywordSuggestionsOptions,
  KeywordWarning,
  JobMatchResult,
} from '../interfaces';

/**
 * Industry keywords - should be moved to database/config in future
 */
const INDUSTRY_KEYWORDS: Record<Industry, string[]> = {
  software_engineering: [
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
  ],
  data_science: [
    'Python',
    'R',
    'SQL',
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
  ],
  devops: [
    'AWS',
    'Azure',
    'GCP',
    'Docker',
    'Kubernetes',
    'Terraform',
    'Ansible',
    'Jenkins',
    'CI/CD',
    'Linux',
    'Bash',
    'Python',
    'Monitoring',
    'Prometheus',
    'Grafana',
    'Infrastructure',
  ],
  product_management: [
    'Agile',
    'Scrum',
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
  ],
  design: [
    'Figma',
    'Sketch',
    'Adobe XD',
    'UI/UX',
    'User Research',
    'Wireframing',
    'Prototyping',
    'Design Systems',
    'Responsive Design',
    'Accessibility',
    'Visual Design',
    'Typography',
  ],
  marketing: [
    'SEO',
    'SEM',
    'Content Marketing',
    'Social Media',
    'Analytics',
    'Google Analytics',
    'Email Marketing',
    'CRM',
    'HubSpot',
    'Salesforce',
    'PPC',
    'Brand Strategy',
  ],
  finance: [
    'Financial Analysis',
    'Excel',
    'SQL',
    'Python',
    'Bloomberg',
    'Risk Management',
    'Valuation',
    'Financial Modeling',
    'Accounting',
    'Compliance',
    'Investment',
  ],
  healthcare: [
    'Clinical',
    'Patient Care',
    'HIPAA',
    'EMR',
    'EHR',
    'Healthcare Administration',
    'Medical Terminology',
    'Research',
    'Compliance',
  ],
  education: [
    'Curriculum Development',
    'Teaching',
    'Assessment',
    'Learning Management',
    'EdTech',
    'Student Engagement',
    'Classroom Management',
  ],
  other: [],
};

/**
 * Resume data structure for keyword analysis
 */
export interface ResumeForKeywords {
  summary?: string | null;
  jobTitle?: string | null;
  skills: Array<{ name: string }>;
  experiences: Array<{
    title?: string | null;
    company?: string | null;
    description?: string | null;
  }>;
}

@Injectable()
export class KeywordAnalyzerService {
  /**
   * Get keyword suggestions for a resume based on industry
   */
  getSuggestions(
    resume: ResumeForKeywords,
    options: KeywordSuggestionsOptions,
  ): KeywordSuggestions {
    const resumeText = this.extractResumeText(resume);
    const industryKeywords = INDUSTRY_KEYWORDS[options.industry];

    const existingKeywords = this.findExistingKeywords(
      resumeText,
      industryKeywords,
    );
    const missingKeywords = industryKeywords.filter(
      (kw) =>
        !existingKeywords.some(
          (ek) => ek.keyword.toLowerCase() === kw.toLowerCase(),
        ),
    );

    const wordCount = resumeText.split(/\s+/).length;
    const keywordCount = existingKeywords.reduce(
      (sum, kw) => sum + kw.count,
      0,
    );
    const keywordDensity = wordCount > 0 ? (keywordCount / wordCount) * 100 : 0;

    const warnings = this.detectWarnings(existingKeywords, keywordDensity);

    return {
      existingKeywords,
      missingKeywords: missingKeywords.slice(0, 10),
      keywordDensity: Math.round(keywordDensity * 100) / 100,
      warnings,
      recommendations: this.generateRecommendations(
        missingKeywords,
        options.industry,
      ),
    };
  }

  /**
   * Match resume against a job description
   */
  matchJobDescription(
    resume: ResumeForKeywords,
    jobDescription: string,
  ): JobMatchResult {
    const resumeText = this.extractResumeText(resume).toLowerCase();
    const jobKeywords = this.extractJobKeywords(jobDescription);

    const matchedKeywords: string[] = [];
    const missingKeywords: string[] = [];

    for (const keyword of jobKeywords) {
      if (resumeText.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
      } else {
        missingKeywords.push(keyword);
      }
    }

    const matchScore =
      jobKeywords.length > 0
        ? (matchedKeywords.length / jobKeywords.length) * 100
        : 0;

    return {
      matchScore: Math.round(matchScore),
      matchedKeywords,
      missingKeywords,
      partialMatches: [],
      recommendations: this.generateMatchRecommendations(missingKeywords),
    };
  }

  /**
   * Get industry keywords for a given industry
   */
  getIndustryKeywords(industry: Industry): string[] {
    return INDUSTRY_KEYWORDS[industry];
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private extractResumeText(resume: ResumeForKeywords): string {
    const parts: string[] = [];

    if (resume.summary) parts.push(resume.summary);
    if (resume.jobTitle) parts.push(resume.jobTitle);

    parts.push(...resume.skills.map((s) => s.name));

    for (const exp of resume.experiences) {
      if (exp.title) parts.push(exp.title);
      if (exp.company) parts.push(exp.company);
      if (exp.description) parts.push(exp.description);
    }

    return parts.join(' ');
  }

  private findExistingKeywords(
    text: string,
    industryKeywords: string[],
  ): Array<{ keyword: string; count: number; relevance: number }> {
    const textLower = text.toLowerCase();
    const results: Array<{
      keyword: string;
      count: number;
      relevance: number;
    }> = [];

    for (const keyword of industryKeywords) {
      const regex = new RegExp(keyword, 'gi');
      const matches = textLower.match(regex);
      if (matches && matches.length > 0) {
        results.push({
          keyword,
          count: matches.length,
          relevance: Math.min(matches.length * 20, 100),
        });
      }
    }

    return results.sort((a, b) => b.count - a.count);
  }

  private detectWarnings(
    keywords: Array<{ keyword: string; count: number }>,
    density: number,
  ): KeywordWarning[] {
    const warnings: KeywordWarning[] = [];

    const stuffedKeywords = keywords.filter((k) => k.count > 5);
    if (stuffedKeywords.length > 0 || density > 10) {
      warnings.push({
        type: 'keyword_stuffing',
        message:
          'Some keywords appear too frequently, which may hurt ATS score',
        affectedKeywords: stuffedKeywords.map((k) => k.keyword),
      });
    }

    if (density < 1 && keywords.length > 0) {
      warnings.push({
        type: 'low_density',
        message: 'Keyword density is too low for optimal ATS scoring',
        affectedKeywords: [],
      });
    }

    return warnings;
  }

  private extractJobKeywords(jobDescription: string): string[] {
    const allKeywords = Object.values(INDUSTRY_KEYWORDS).flat();
    const jobLower = jobDescription.toLowerCase();

    return allKeywords.filter((kw) => jobLower.includes(kw.toLowerCase()));
  }

  private generateRecommendations(
    missingKeywords: string[],
    industry: Industry,
  ): string[] {
    if (missingKeywords.length === 0) return [];

    return [
      `Consider adding these ${industry} keywords: ${missingKeywords.slice(0, 5).join(', ')}`,
      'Place keywords naturally in your summary and experience descriptions',
      'Match keywords from job descriptions you are targeting',
    ];
  }

  private generateMatchRecommendations(missingKeywords: string[]): string[] {
    if (missingKeywords.length === 0) {
      return [
        'Great match! Your resume aligns well with this job description.',
      ];
    }

    return [
      `Add these missing skills/keywords: ${missingKeywords.slice(0, 5).join(', ')}`,
      'Tailor your summary to match the job requirements',
      'Include relevant project experience for missing technologies',
    ];
  }
}
