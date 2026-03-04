/**
 * ATS Score Service
 *
 * Calculates ATS compatibility scores from generic resume sections.
 * NO type-specific knowledge - uses semanticKind to find sections.
 */

import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getString } from '@/shared-kernel/types/section-projection.adapter';
import { generateATSRecommendations } from '../domain/services';
import type { AnalyticsSection, ResumeForAnalytics } from '../domain/types';
import { ACTION_VERBS } from '../domain/value-objects/action-verbs';
import type { ATSIssue, ATSScoreBreakdown, ATSScoreResult } from '../interfaces';

/**
 * Count items across sections matching a semanticKind pattern.
 */
function countItemsMatchingKind(
  sections: readonly AnalyticsSection[],
  kindPattern: RegExp,
): number {
  return sections
    .filter((s) => kindPattern.test(s.semanticKind))
    .reduce((sum, s) => sum + s.items.length, 0);
}

/**
 * Extract all description-like text from sections.
 */
function extractDescriptions(sections: readonly AnalyticsSection[]): string {
  return sections
    .flatMap((s) =>
      s.items.map(
        (item) =>
          getString(item.content, 'description') ?? getString(item.content, 'summary') ?? '',
      ),
    )
    .join(' ')
    .toLowerCase();
}

@Injectable()
export class ATSScoreService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  calculate(resume: ResumeForAnalytics, resumeId?: string): ATSScoreResult {
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
      keywordsScore * 0.3 + formatScore * 0.2 + completenessScore * 0.25 + experienceScore * 0.25,
    );

    const result = {
      score: Math.max(0, Math.min(100, score)),
      breakdown,
      issues,
      recommendations: generateATSRecommendations(issues),
    };

    // Emit SSE event if resumeId is provided
    if (resumeId) {
      this.eventEmitter.emit(`analytics:${resumeId}:ats_score`, {
        type: 'ats_score',
        resumeId,
        data: {
          atsScore: result.score,
          timestamp: new Date(),
        },
      });
    }

    return result;
  }

  /**
   * Calculate keywords score from skill-like sections.
   * Matches SKILL, SKILL_SET, SKILLS, etc.
   */
  private calculateKeywordsScore(resume: ResumeForAnalytics): number {
    const skillCount = countItemsMatchingKind(resume.sections, /skill/i);
    return Math.min(skillCount * 5, 50) + 30;
  }

  /**
   * Calculate format score from experience-like sections.
   * Matches WORK_EXPERIENCE, EXPERIENCE, PROJECT, VOLUNTEER, etc.
   */
  private calculateFormatScore(resume: ResumeForAnalytics, issues: ATSIssue[]): number {
    let score = 100;
    const allDescriptions = extractDescriptions(resume.sections);
    const actionVerbCount = ACTION_VERBS.filter((verb) => allDescriptions.includes(verb)).length;
    if (actionVerbCount < 3) {
      score -= 20;
      issues.push({
        type: 'weak_action_verbs',
        severity: 'medium',
        message: 'Use more action verbs',
      });
    }
    return Math.max(score, 0);
  }

  /**
   * Calculate completeness score.
   * Checks for contact info, summary, and skill-like sections.
   */
  private calculateCompletenessScore(resume: ResumeForAnalytics, issues: ATSIssue[]): number {
    let score = 100;
    if (!resume.emailContact && !resume.phone) {
      score -= 30;
      issues.push({
        type: 'missing_contact',
        severity: 'high',
        message: 'Add contact info',
      });
    }
    if ((resume.summary ?? '').length < 50) {
      score -= 20;
      issues.push({
        type: 'short_summary',
        severity: 'medium',
        message: 'Expand summary',
      });
    }
    const skillCount = countItemsMatchingKind(resume.sections, /skill/i);
    if (skillCount === 0) {
      score -= 25;
      issues.push({
        type: 'missing_skills',
        severity: 'high',
        message: 'Add skills',
      });
    }
    return Math.max(score, 0);
  }

  /**
   * Calculate experience score from experience-like sections.
   * Matches WORK_EXPERIENCE, EXPERIENCE, etc.
   */
  private calculateExperienceScore(resume: ResumeForAnalytics, issues: ATSIssue[]): number {
    // Match experience-like sections
    const experienceCount = countItemsMatchingKind(resume.sections, /experience/i);
    if (experienceCount === 0) {
      issues.push({
        type: 'no_experience',
        severity: 'high',
        message: 'Add experience',
      });
      return 0;
    }

    const descriptions = extractDescriptions(resume.sections);
    const hasNumbers = /\d+%|\$\d+|\d+ (years?|months?|people|engineers?|team)/i.test(descriptions);
    if (!hasNumbers) {
      issues.push({
        type: 'no_quantified_achievements',
        severity: 'medium',
        message: 'Add metrics',
      });
    }
    return hasNumbers ? 90 : 70;
  }
}
