import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type {
  ATSScoreResult,
  ATSScoreBreakdown,
  ATSIssue,
} from '../interfaces';
import type { ResumeForATS } from '../domain/types';
import { ACTION_VERBS } from '../domain/value-objects/action-verbs';
import { generateATSRecommendations } from '../domain/services';

@Injectable()
export class ATSScoreService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  calculate(resume: ResumeForATS, resumeId?: string): ATSScoreResult {
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

  private calculateKeywordsScore(resume: ResumeForATS): number {
    return Math.min(resume.skills.length * 5, 50) + 30;
  }

  private calculateFormatScore(
    resume: ResumeForATS,
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
        message: 'Use more action verbs',
      });
    }
    return Math.max(score, 0);
  }

  private calculateCompletenessScore(
    resume: ResumeForATS,
    issues: ATSIssue[],
  ): number {
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
    if (resume.skills.length === 0) {
      score -= 25;
      issues.push({
        type: 'missing_skills',
        severity: 'high',
        message: 'Add skills',
      });
    }
    return Math.max(score, 0);
  }

  private calculateExperienceScore(
    resume: ResumeForATS,
    issues: ATSIssue[],
  ): number {
    if (resume.experiences.length === 0) {
      issues.push({
        type: 'no_experience',
        severity: 'high',
        message: 'Add experience',
      });
      return 0;
    }
    const descriptions = resume.experiences
      .map((e) => e.description ?? '')
      .join(' ');
    const hasNumbers =
      /\d+%|\$\d+|\d+ (years?|months?|people|engineers?|team)/i.test(
        descriptions,
      );
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
