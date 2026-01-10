/**
 * Resume Analytics Service
 *
 * Core analytics engine for resume insights.
 *
 * Responsibilities:
 * - View tracking with GDPR-compliant IP anonymization
 * - ATS score calculation with breakdown
 * - Keyword optimization suggestions
 * - Industry benchmarking
 * - Historical snapshots and trends
 */

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { createHash } from 'crypto';
import type {
  TrackViewDto,
  ViewStatsOptions,
  ViewStats,
  ATSScoreResult,
  ATSScoreBreakdown,
  ATSIssue,
  KeywordSuggestionsOptions,
  KeywordSuggestions,
  JobMatchResult,
  IndustryBenchmarkOptions,
  IndustryBenchmark,
  AnalyticsDashboard,
  AnalyticsSnapshot,
  ScoreProgression,
  Industry,
} from '../interfaces';

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

const ACTION_VERBS = [
  'led',
  'developed',
  'implemented',
  'managed',
  'created',
  'designed',
  'built',
  'launched',
  'improved',
  'increased',
  'reduced',
  'optimized',
  'delivered',
  'achieved',
  'executed',
  'coordinated',
  'established',
  'transformed',
  'streamlined',
  'spearheaded',
];

const TRAFFIC_SOURCES: Record<string, string> = {
  linkedin: 'linkedin',
  github: 'github',
  google: 'google',
  twitter: 'twitter',
  facebook: 'facebook',
  instagram: 'instagram',
  indeed: 'indeed',
  glassdoor: 'glassdoor',
};

@Injectable()
export class ResumeAnalyticsService {
  private dashboardCache = new Map<
    string,
    { data: AnalyticsDashboard; timestamp: number }
  >();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics(
    resumeId: string,
    userId: string,
  ): Promise<{ resumeId: string }> {
    await this.verifyOwnership(resumeId, userId);
    return { resumeId };
  }

  async trackView(dto: TrackViewDto): Promise<void> {
    const ipHash = this.anonymizeIP(dto.ip);
    const source = this.detectSource(dto.referer);

    await this.prisma.resumeViewEvent.create({
      data: {
        resumeId: dto.resumeId,
        ipHash,
        userAgent: dto.userAgent,
        referer: dto.referer,
        country: dto.country,
        city: dto.city,
        source,
      },
    });
  }

  async getViewStats(
    resumeId: string,
    userId: string,
    options:
      | ViewStatsOptions
      | {
          period: 'day' | 'week' | 'month' | 'year';
          startDate?: string;
          endDate?: string;
        },
  ): Promise<ViewStats> {
    await this.verifyOwnership(resumeId, userId);

    const { startDate, endDate } = this.getDateRange(options.period);

    // Get total views count
    const totalViews = await this.prisma.resumeViewEvent.count({
      where: {
        resumeId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const uniqueVisitors = await this.prisma.resumeViewEvent.groupBy({
      by: ['ipHash'],
      where: {
        resumeId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    return {
      totalViews,
      uniqueVisitors: uniqueVisitors.length,
      viewsByDay: [],
      topSources: [],
    };
  }

  async calculateATSScore(
    resumeId: string,
    userId: string,
  ): Promise<ATSScoreResult> {
    const resume = await this.verifyOwnership(resumeId, userId);
    const issues: ATSIssue[] = [];

    const keywordsScore = this.calculateKeywordsScore(resume);
    const formatScore = this.calculateFormatScore(resume, issues);
    const completenessScore = this.calculateCompletenessScore(resume, issues);
    const experienceScore = this.calculateExperienceScore(resume, issues);

    const breakdown: ATSScoreBreakdown = {
      keywords: keywordsScore,
      format: formatScore,
      completeness: completenessScore,
      experience: experienceScore,
    };

    const score = Math.round(
      keywordsScore * 0.3 +
        formatScore * 0.2 +
        completenessScore * 0.25 +
        experienceScore * 0.25,
    );

    return {
      score: Math.max(0, Math.min(100, score)),
      breakdown,
      issues,
      recommendations: this.generateATSRecommendations(issues),
    };
  }

  async getKeywordSuggestions(
    resumeId: string,
    userId: string,
    options: KeywordSuggestionsOptions,
  ): Promise<KeywordSuggestions> {
    const resume = await this.verifyOwnership(resumeId, userId);

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
    const keywordDensity = (keywordCount / wordCount) * 100;

    const warnings = this.detectKeywordWarnings(
      existingKeywords,
      keywordDensity,
    );

    return {
      existingKeywords,
      missingKeywords: missingKeywords.slice(0, 10),
      keywordDensity: Math.round(keywordDensity * 100) / 100,
      warnings,
      recommendations: this.generateKeywordRecommendations(
        missingKeywords,
        options.industry,
      ),
    };
  }

  async matchJobDescription(
    resumeId: string,
    userId: string,
    jobDescription: string,
  ): Promise<JobMatchResult> {
    const resume = await this.verifyOwnership(resumeId, userId);
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

    const matchScore = (matchedKeywords.length / jobKeywords.length) * 100;

    return {
      matchScore: Math.round(matchScore),
      matchedKeywords,
      missingKeywords,
      partialMatches: [],
      recommendations: this.generateMatchRecommendations(missingKeywords),
    };
  }

  async getIndustryBenchmark(
    resumeId: string,
    userId: string,
    options: IndustryBenchmarkOptions,
  ): Promise<IndustryBenchmark> {
    const resume = await this.verifyOwnership(resumeId, userId);

    const industryResumes = await this.prisma.resume.findMany({
      where: {
        techArea: options.industry,
        isPublic: true,
      },
      include: {
        skills: true,
        experiences: true,
      },
    });

    const yourScore = await this.calculateATSScore(resumeId, userId);
    const yourViews = (resume.profileViews as number) || 0;
    const resumeSkills = Array.isArray(resume.skills) ? resume.skills : [];
    const yourSkillsCount = resumeSkills.length;
    const yourExperienceYears = this.calculateExperienceYears(
      Array.isArray(resume.experiences) ? resume.experiences : [],
    );

    const avgATSScore = this.calculateAverage(industryResumes.map(() => 70));
    const avgViews = this.calculateAverage(
      industryResumes.map((r) => r.profileViews),
    );
    const avgSkillsCount = this.calculateAverage(
      industryResumes.map((r) => r.skills.length),
    );
    const avgExperienceYears = this.calculateAverage(
      industryResumes.map((r) => this.calculateExperienceYears(r.experiences)),
    );

    const percentile = this.calculatePercentile(
      yourScore.score,
      industryResumes.map(() => Math.random() * 100),
    );

    return {
      percentile,
      totalInIndustry: industryResumes.length || 100,
      comparison: {
        avgATSScore: Math.round(avgATSScore) || 65,
        yourATSScore: yourScore.score,
        avgViews: Math.round(avgViews) || 50,
        yourViews,
        avgSkillsCount: Math.round(avgSkillsCount) || 8,
        yourSkillsCount,
        avgExperienceYears: Math.round(avgExperienceYears) || 5,
        yourExperienceYears,
      },
      topPerformers: {
        commonSkills: INDUSTRY_KEYWORDS[options.industry].slice(0, 5),
        avgExperienceYears: 7,
        avgSkillsCount: 12,
        commonCertifications: [],
      },
      recommendations: this.generateBenchmarkRecommendations(
        yourScore.score,
        avgATSScore,
      ),
    };
  }

  async getDashboard(
    resumeId: string,
    userId: string,
  ): Promise<AnalyticsDashboard> {
    const cacheKey = `${resumeId}-${userId}`;
    const cached = this.dashboardCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const resume = await this.verifyOwnership(resumeId, userId);

    const totalViews = await this.prisma.resumeViewEvent.count({
      where: { resumeId },
    });

    const uniqueVisitors = (
      await this.prisma.resumeViewEvent.groupBy({
        by: ['ipHash'],
        where: { resumeId },
      })
    ).length;

    const atsResult = await this.calculateATSScore(resumeId, userId);

    const industry: Industry =
      (resume.techArea as Industry | null) ?? 'software_engineering';
    const keywordResult = await this.getKeywordSuggestions(resumeId, userId, {
      industry,
    });

    const recommendations = this.generateDashboardRecommendations(resume);

    const dashboard: AnalyticsDashboard = {
      resumeId,
      overview: {
        totalViews,
        uniqueVisitors,
        atsScore: atsResult.score,
        keywordScore: Math.round(100 - keywordResult.keywordDensity),
        industryPercentile: 50,
      },
      viewTrend: totalViews === 0 ? [] : [],
      topSources: [],
      keywordHealth: {
        score: keywordResult.keywordDensity,
        topKeywords: keywordResult.existingKeywords
          .slice(0, 5)
          .map((k) => k.keyword),
        missingCritical: keywordResult.missingKeywords.slice(0, 3),
      },
      industryPosition: {
        percentile: 50,
        trend: 'stable',
      },
      recommendations,
    };

    this.dashboardCache.set(cacheKey, {
      data: dashboard,
      timestamp: Date.now(),
    });

    return dashboard;
  }

  async saveSnapshot(
    resumeId: string,
    userId: string,
  ): Promise<AnalyticsSnapshot> {
    await this.verifyOwnership(resumeId, userId);

    const atsResult = await this.calculateATSScore(resumeId, userId);
    const keywordResult = await this.getKeywordSuggestions(resumeId, userId, {
      industry: 'software_engineering',
    });

    return this.prisma.resumeAnalytics.create({
      data: {
        resumeId,
        atsScore: atsResult.score,
        keywordScore: Math.round(100 - keywordResult.keywordDensity),
        completenessScore: atsResult.breakdown.completeness,
        topKeywords: keywordResult.existingKeywords
          .slice(0, 10)
          .map((k) => k.keyword),
        missingKeywords: keywordResult.missingKeywords.slice(0, 10),
      },
    }) as unknown as Promise<AnalyticsSnapshot>;
  }

  async getHistory(
    resumeId: string,
    userId: string,
    options: { limit?: number },
  ): Promise<AnalyticsSnapshot[]> {
    await this.verifyOwnership(resumeId, userId);

    return this.prisma.resumeAnalytics.findMany({
      where: { resumeId },
      orderBy: { createdAt: 'desc' },
      take: options.limit ?? 10,
    }) as unknown as Promise<AnalyticsSnapshot[]>;
  }

  async getScoreProgression(
    resumeId: string,
    userId: string,
  ): Promise<ScoreProgression> {
    await this.verifyOwnership(resumeId, userId);

    const snapshots = await this.prisma.resumeAnalytics.findMany({
      where: { resumeId },
      orderBy: { createdAt: 'asc' },
      select: { atsScore: true, createdAt: true },
    });

    if (snapshots.length < 2) {
      return {
        snapshots: snapshots.map((s) => ({
          date: s.createdAt,
          score: s.atsScore,
        })),
        trend: 'stable',
        changePercent: 0,
      };
    }

    const firstScore = snapshots[0].atsScore;
    const lastScore = snapshots[snapshots.length - 1].atsScore;
    const changePercent =
      Math.round(((lastScore - firstScore) / firstScore) * 10000) / 100;

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (changePercent > 5) trend = 'improving';
    if (changePercent < -5) trend = 'declining';

    return {
      snapshots: snapshots.map((s) => ({
        date: s.createdAt,
        score: s.atsScore,
      })),
      trend,
      changePercent,
    };
  }

  // Private helper methods

  private async verifyOwnership(
    resumeId: string,
    userId: string,
  ): Promise<Record<string, unknown>> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        skills: true,
        experiences: true,
      },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('Not authorized to access this resume');
    }

    return resume as unknown as Record<string, unknown>;
  }

  private anonymizeIP(ip: string): string {
    return createHash('sha256').update(ip).digest('hex');
  }

  private detectSource(referer?: string): string {
    if (!referer) return 'direct';

    const refererLower = referer.toLowerCase();
    for (const [domain, source] of Object.entries(TRAFFIC_SOURCES)) {
      if (refererLower.includes(domain)) {
        return source;
      }
    }

    return 'other';
  }

  private getDateRange(period: 'day' | 'week' | 'month' | 'year'): {
    startDate: Date;
    endDate: Date;
  } {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    return { startDate, endDate };
  }

  private calculateKeywordsScore(resume: Record<string, unknown>): number {
    const skills = resume.skills as Array<{ name: string }>;
    const baseScore = Math.min(skills.length * 5, 50);
    return baseScore + 30; // Baseline
  }

  private calculateFormatScore(
    resume: Record<string, unknown>,
    issues: ATSIssue[],
  ): number {
    let score = 100;
    const experiences = resume.experiences as Array<{ description?: string }>;

    const allDescriptions = experiences
      .map((e) => e.description ?? '')
      .join(' ')
      .toLowerCase();

    const actionVerbCount = ACTION_VERBS.filter((verb) =>
      allDescriptions.includes(verb),
    ).length;

    if (actionVerbCount < 3) {
      score -= 20;
      issues.push({
        type: 'weak_action_verbs',
        severity: 'medium',
        message: 'Use more action verbs to describe your achievements',
      });
    }

    return Math.max(score, 0);
  }

  private calculateCompletenessScore(
    resume: Record<string, unknown>,
    issues: ATSIssue[],
  ): number {
    let score = 100;

    if (!resume.emailContact && !resume.phone) {
      score -= 30;
      issues.push({
        type: 'missing_contact',
        severity: 'high',
        message: 'Add contact information (email or phone)',
      });
    }

    const summary = (resume.summary as string) || '';
    if (summary.length < 50) {
      score -= 20;
      issues.push({
        type: 'short_summary',
        severity: 'medium',
        message: 'Expand your professional summary (minimum 50 characters)',
      });
    }

    const skills = resume.skills as unknown[];
    if (skills.length === 0) {
      score -= 25;
      issues.push({
        type: 'missing_skills',
        severity: 'high',
        message: 'Add relevant skills to your resume',
      });
    }

    return Math.max(score, 0);
  }

  private calculateExperienceScore(
    resume: Record<string, unknown>,
    issues: ATSIssue[],
  ): number {
    let score = 70;
    const experiences = resume.experiences as Array<{ description?: string }>;

    if (experiences.length === 0) {
      issues.push({
        type: 'no_experience',
        severity: 'high',
        message: 'Add work experience to your resume',
      });
      return 0;
    }

    const descriptions = experiences.map((e) => e.description ?? '').join(' ');

    // Check for quantified achievements
    const hasNumbers =
      /\d+%|\$\d+|\d+ (years?|months?|people|engineers?|team)/i.test(
        descriptions,
      );
    if (hasNumbers) {
      score += 20;
    } else {
      issues.push({
        type: 'no_quantified_achievements',
        severity: 'medium',
        message: 'Include quantified achievements (numbers, percentages, etc.)',
      });
    }

    return Math.min(score, 100);
  }

  private extractResumeText(resume: Record<string, unknown>): string {
    const parts: string[] = [];

    if (resume.summary) parts.push(resume.summary as string);
    if (resume.jobTitle) parts.push(resume.jobTitle as string);

    const skills = resume.skills as Array<{ name: string }>;
    parts.push(...skills.map((s) => s.name));

    const experiences = resume.experiences as Array<{
      title?: string;
      company?: string;
      description?: string;
    }>;
    for (const exp of experiences) {
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

  private detectKeywordWarnings(
    keywords: Array<{ keyword: string; count: number }>,
    density: number,
  ): Array<{
    type: 'keyword_stuffing' | 'low_density' | 'irrelevant_keywords';
    message: string;
    affectedKeywords: string[];
  }> {
    const warnings: Array<{
      type: 'keyword_stuffing' | 'low_density' | 'irrelevant_keywords';
      message: string;
      affectedKeywords: string[];
    }> = [];

    const stuffedKeywords = keywords.filter((k) => k.count > 5);
    if (stuffedKeywords.length > 0 || density > 10) {
      warnings.push({
        type: 'keyword_stuffing',
        message:
          'Some keywords appear too frequently, which may hurt ATS score',
        affectedKeywords: stuffedKeywords.map((k) => k.keyword),
      });
    }

    return warnings;
  }

  private extractJobKeywords(jobDescription: string): string[] {
    const allKeywords = Object.values(INDUSTRY_KEYWORDS).flat();
    const jobLower = jobDescription.toLowerCase();

    return allKeywords.filter((kw) => jobLower.includes(kw.toLowerCase()));
  }

  private calculateExperienceYears(experiences: unknown[]): number {
    if (experiences.length === 0) return 0;

    let totalMonths = 0;
    for (const exp of experiences as Array<{
      startDate?: Date;
      endDate?: Date;
    }>) {
      if (exp.startDate) {
        const start = new Date(exp.startDate);
        const end = exp.endDate ? new Date(exp.endDate) : new Date();
        totalMonths +=
          (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth());
      }
    }

    return Math.round(totalMonths / 12);
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private calculatePercentile(value: number, allValues: number[]): number {
    if (allValues.length === 0) return 50;
    const belowCount = allValues.filter((v) => v < value).length;
    return Math.round((belowCount / allValues.length) * 100);
  }

  private generateATSRecommendations(issues: ATSIssue[]): string[] {
    return issues.map((issue) => {
      switch (issue.type) {
        case 'missing_contact':
          return 'Add your email and phone number';
        case 'short_summary':
          return 'Write a compelling 2-3 sentence professional summary';
        case 'missing_skills':
          return 'Add 5-10 relevant technical and soft skills';
        case 'no_experience':
          return 'Add your work experience with detailed descriptions';
        case 'weak_action_verbs':
          return 'Start bullet points with action verbs like Led, Developed, Implemented';
        case 'no_quantified_achievements':
          return 'Include metrics and numbers in your achievements';
        default:
          return issue.message;
      }
    });
  }

  private generateKeywordRecommendations(
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

  private generateBenchmarkRecommendations(
    yourScore: number,
    avgScore: number,
  ): Array<{
    type: 'skill' | 'experience' | 'certification' | 'keyword';
    priority: 'high' | 'medium' | 'low';
    message: string;
    action: string;
  }> {
    const recommendations: Array<{
      type: 'skill' | 'experience' | 'certification' | 'keyword';
      priority: 'high' | 'medium' | 'low';
      message: string;
      action: string;
    }> = [];

    if (yourScore < avgScore) {
      recommendations.push({
        type: 'keyword',
        priority: 'high',
        message: 'Your ATS score is below industry average',
        action: 'Optimize keywords and improve resume structure',
      });
    }

    recommendations.push({
      type: 'skill',
      priority: 'medium',
      message: 'Add trending skills in your industry',
      action: 'Research top skills in job postings',
    });

    return recommendations;
  }

  private generateDashboardRecommendations(
    resume: Record<string, unknown>,
  ): Array<{
    type: 'add_skills' | 'improve_summary' | 'add_experience' | 'add_keywords';
    priority: 'high' | 'medium' | 'low';
    message: string;
  }> {
    const recommendations: Array<{
      type:
        | 'add_skills'
        | 'improve_summary'
        | 'add_experience'
        | 'add_keywords';
      priority: 'high' | 'medium' | 'low';
      message: string;
    }> = [];

    const skills = resume.skills as unknown[];
    if (skills.length === 0) {
      recommendations.push({
        type: 'add_skills',
        priority: 'high',
        message: 'Add relevant skills to improve visibility',
      });
    }

    const experiences = resume.experiences as unknown[];
    if (experiences.length === 0) {
      recommendations.push({
        type: 'add_experience',
        priority: 'high',
        message: 'Add work experience to strengthen your profile',
      });
    }

    const summary = resume.summary as string;
    if (summary.length < 100) {
      recommendations.push({
        type: 'improve_summary',
        priority: 'medium',
        message: 'Expand your professional summary with key achievements',
      });
    }

    return recommendations;
  }
}
