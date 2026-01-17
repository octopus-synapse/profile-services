/**
 * ATS Score Service
 *
 * Calculates Applicant Tracking System compatibility scores for resumes.
 * Analyzes keywords, format, completeness, and experience sections.
 *
 * Extracted from ResumeAnalyticsService as part of god class decomposition.
 * @see ADR-000X — Enforce Disciplined, Persona-Aware Engineering
 */

import { Injectable } from '@nestjs/common';
import type {
  ATSScoreResult,
  ATSScoreBreakdown,
  ATSIssue,
} from '../interfaces';

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

/**
 * Resume data structure for ATS scoring
 */
export interface ResumeForScoring {
  summary?: string | null;
  jobTitle?: string | null;
  emailContact?: string | null;
  phone?: string | null;
  skills: Array<{ name: string }>;
  experiences: Array<{ description?: string | null }>;
}

@Injectable()
export class ATSScoreService {
  /**
   * Calculate comprehensive ATS compatibility score
   */
  calculateScore(resume: ResumeForScoring): ATSScoreResult {
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
      recommendations: this.generateRecommendations(issues),
    };
  }

  // ============================================================================
  // Score Components
  // ============================================================================

  private calculateKeywordsScore(resume: ResumeForScoring): number {
    const baseScore = Math.min(resume.skills.length * 5, 50);
    return baseScore + 30; // Baseline
  }

  private calculateFormatScore(
    resume: ResumeForScoring,
    issues: ATSIssue[],
  ): number {
    let score = 100;

    const allDescriptions = resume.experiences
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
    resume: ResumeForScoring,
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

    const summary = resume.summary ?? '';
    if (summary.length < 50) {
      score -= 20;
      issues.push({
        type: 'short_summary',
        severity: 'medium',
        message: 'Expand your professional summary (minimum 50 characters)',
      });
    }

    if (resume.skills.length === 0) {
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
    resume: ResumeForScoring,
    issues: ATSIssue[],
  ): number {
    let score = 70;

    if (resume.experiences.length === 0) {
      issues.push({
        type: 'no_experience',
        severity: 'high',
        message: 'Add work experience to your resume',
      });
      return 0;
    }

    const descriptions = resume.experiences
      .map((e) => e.description ?? '')
      .join(' ');

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

  // ============================================================================
  // Recommendations
  // ============================================================================

  private generateRecommendations(issues: ATSIssue[]): string[] {
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
}
