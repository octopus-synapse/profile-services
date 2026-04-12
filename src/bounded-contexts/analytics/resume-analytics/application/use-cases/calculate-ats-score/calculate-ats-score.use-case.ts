/**
 * Calculate ATS Score Use Case
 *
 * Calculates ATS compatibility scores using section type definitions
 * loaded from the database. ZERO hardcoded section knowledge.
 */

import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { EventPublisher } from '@/shared-kernel';
import { AtsScoreCalculatedEvent } from '../../../../shared-kernel/domain/events';
import { generateRecommendations } from '../../../domain/services';
import type { AnalyticsSection, ResumeForAnalytics } from '../../../domain/types';
import type { ATSIssue, ATSScoreResult, SectionScoreBreakdown } from '../../../interfaces';
import type {
  AtsScoreCatalogPort,
  ResumeOwnershipPort,
  SectionTypeAtsConfig,
} from '../../ports/resume-analytics.port';

export class CalculateAtsScoreUseCase {
  constructor(
    private readonly catalog: AtsScoreCatalogPort,
    private readonly ownership: ResumeOwnershipPort,
    private readonly eventEmitter: EventEmitter2,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(resumeId: string, userId: string): Promise<ATSScoreResult> {
    await this.ownership.verifyOwnership(resumeId, userId);
    const resume = await this.ownership.getResumeWithDetails(resumeId);
    const result = await this.calculate(resume, resumeId);

    this.eventPublisher.publish(
      new AtsScoreCalculatedEvent(resumeId, {
        score: result.score,
        issues: result.issues.map((i) => i.code),
      }),
    );

    return result;
  }

  /**
   * Core calculation — also used by other use cases (dashboard, snapshot).
   */
  async calculate(resume: ResumeForAnalytics, resumeId?: string): Promise<ATSScoreResult> {
    const catalogEntries = await this.catalog.loadCatalog();

    const resumeIssues = this.checkResumeLevel(resume);
    const mandatoryIssues = this.checkMandatorySections(resume.sections, catalogEntries);
    const sectionBreakdown = this.scoreSections(resume.sections, catalogEntries);
    const contentIssues = this.checkContentQuality(resume.sections, catalogEntries);

    const allIssues = [...resumeIssues, ...mandatoryIssues, ...contentIssues];
    const score = this.calculateOverallScore(sectionBreakdown, resumeIssues);

    const result: ATSScoreResult = {
      score,
      sectionBreakdown,
      issues: allIssues,
      recommendations: generateRecommendations(allIssues),
    };

    if (resumeId) {
      this.eventEmitter.emit(`analytics:${resumeId}:ats_score`, {
        type: 'ats_score',
        resumeId,
        data: { atsScore: result.score, timestamp: new Date() },
      });
    }

    return result;
  }

  private checkResumeLevel(resume: ResumeForAnalytics): ATSIssue[] {
    const issues: ATSIssue[] = [];

    if (!resume.emailContact && !resume.phone) {
      issues.push({
        code: 'MISSING_CONTACT_INFO',
        severity: 'high',
        message: 'Add your email address and phone number',
      });
    }

    if ((resume.summary ?? '').length < 50) {
      issues.push({
        code: 'SHORT_SUMMARY',
        severity: 'medium',
        message: 'Write a professional summary of at least 50 characters',
      });
    }

    return issues;
  }

  private checkMandatorySections(
    sections: readonly AnalyticsSection[],
    catalog: SectionTypeAtsConfig[],
  ): ATSIssue[] {
    const issues: ATSIssue[] = [];
    const presentKinds = new Set(sections.map((s) => s.semanticKind));

    for (const entry of catalog) {
      if (entry.ats.isMandatory && !presentKinds.has(entry.kind)) {
        issues.push({
          code: 'MISSING_MANDATORY_SECTION',
          severity: 'high',
          message: `Missing mandatory section: ${entry.kind}`,
          context: { sectionKind: entry.kind },
        });
      }
    }

    return issues;
  }

  private scoreSections(
    sections: readonly AnalyticsSection[],
    catalog: SectionTypeAtsConfig[],
  ): SectionScoreBreakdown[] {
    const catalogByKind = new Map(catalog.map((c) => [c.kind, c]));
    const breakdown: SectionScoreBreakdown[] = [];

    for (const section of sections) {
      const entry = catalogByKind.get(section.semanticKind);
      if (!entry || section.items.length === 0) continue;

      const { baseScore, fieldWeights } = entry.ats.scoring;
      let totalScore = 0;

      for (const item of section.items) {
        let itemScore = baseScore;

        if (Object.keys(fieldWeights).length === 0) {
          const values = Object.values(item.content);
          const nonEmpty = values.filter((v) => this.isNonEmpty(v)).length;
          const density = values.length > 0 ? nonEmpty / values.length : 0;
          itemScore = Math.round(baseScore + density * 45);
        } else {
          for (const [role, weight] of Object.entries(fieldWeights)) {
            const fieldKey = entry.roleToFieldKey[role];
            const value = fieldKey ? item.content[fieldKey] : item.content[role.toLowerCase()];
            if (this.isNonEmpty(value)) {
              itemScore += weight;
            }
          }
        }

        totalScore += Math.min(100, Math.max(0, itemScore));
      }

      breakdown.push({
        sectionKind: section.semanticKind,
        sectionTypeKey: entry.key,
        score: Math.min(100, Math.round(totalScore / section.items.length)),
      });
    }

    return breakdown;
  }

  private checkContentQuality(
    sections: readonly AnalyticsSection[],
    catalog: SectionTypeAtsConfig[],
  ): ATSIssue[] {
    const issues: ATSIssue[] = [];
    const catalogByKind = new Map(catalog.map((c) => [c.kind, c]));

    for (const section of sections) {
      const entry = catalogByKind.get(section.semanticKind);
      if (!entry) continue;

      const { fieldWeights } = entry.ats.scoring;
      if (Object.keys(fieldWeights).length === 0) continue;

      for (const item of section.items) {
        const missingRoles: string[] = [];

        for (const role of Object.keys(fieldWeights)) {
          const fieldKey = entry.roleToFieldKey[role];
          const value = fieldKey ? item.content[fieldKey] : item.content[role.toLowerCase()];
          if (!this.isNonEmpty(value)) {
            missingRoles.push(role);
          }
        }

        if (missingRoles.length > 0) {
          issues.push({
            code: 'MISSING_WEIGHTED_FIELDS',
            severity: missingRoles.length > 2 ? 'high' : 'medium',
            message: `Section ${section.semanticKind} item is missing fields: ${missingRoles.join(', ')}`,
            context: {
              sectionKind: section.semanticKind,
              missingFields: missingRoles,
            },
          });
        }
      }
    }

    return issues;
  }

  private calculateOverallScore(
    sectionBreakdown: SectionScoreBreakdown[],
    resumeIssues: ATSIssue[],
  ): number {
    if (sectionBreakdown.length === 0) return 0;

    const avgSectionScore =
      sectionBreakdown.reduce((sum, b) => sum + b.score, 0) / sectionBreakdown.length;

    let deduction = 0;
    for (const issue of resumeIssues) {
      if (issue.severity === 'high') deduction += 15;
      else if (issue.severity === 'medium') deduction += 10;
      else deduction += 5;
    }

    return Math.max(0, Math.min(100, Math.round(avgSectionScore - deduction)));
  }

  private isNonEmpty(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }
}
