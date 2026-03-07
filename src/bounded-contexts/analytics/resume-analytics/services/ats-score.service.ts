/**
 * ATS Score Service — Definition-Driven
 *
 * Calculates ATS compatibility scores using section type definitions
 * loaded from the database. ZERO hardcoded section knowledge.
 *
 * Scoring algorithm:
 *   Per section: baseScore + Σ(fieldWeight for each filled field)
 *   Overall:     average of section scores − resume-level deductions
 *
 * All scoring configuration (baseScore, fieldWeights, isMandatory)
 * comes from SectionType.definition.ats in the database.
 */

import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { generateRecommendations } from '../domain/services';
import type { AnalyticsSection, ResumeForAnalytics } from '../domain/types';
import type { ATSIssue, ATSScoreResult, SectionScoreBreakdown } from '../interfaces';

interface SectionTypeAtsConfig {
  key: string;
  kind: string;
  ats: {
    isMandatory: boolean;
    recommendedPosition: number;
    scoring: {
      baseScore: number;
      fieldWeights: Record<string, number>;
    };
  };
  /** Maps semantic roles (e.g. ORGANIZATION) → content field keys (e.g. company) */
  roleToFieldKey: Record<string, string>;
}

@Injectable()
export class ATSScoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async calculate(resume: ResumeForAnalytics, resumeId?: string): Promise<ATSScoreResult> {
    const catalog = await this.loadCatalog();

    const resumeIssues = this.checkResumeLevel(resume);
    const mandatoryIssues = this.checkMandatorySections(resume.sections, catalog);
    const sectionBreakdown = this.scoreSections(resume.sections, catalog);
    const contentIssues = this.checkContentQuality(resume.sections, catalog);

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

  // ---------------------------------------------------------------------------
  // Catalog loading — single source of truth from SectionType definitions
  // ---------------------------------------------------------------------------

  private async loadCatalog(): Promise<SectionTypeAtsConfig[]> {
    const sectionTypes = await this.prisma.sectionType.findMany({
      where: { isActive: true },
      select: { key: true, semanticKind: true, definition: true },
    });

    return sectionTypes.map((st) => {
      const def = (st.definition ?? {}) as Record<string, unknown>;
      const ats = (def.ats ?? {}) as Record<string, unknown>;
      const scoring = (ats.scoring ?? {}) as Record<string, unknown>;
      const fields = (def.fields ?? []) as Array<Record<string, unknown>>;

      const roleToFieldKey: Record<string, string> = {};
      for (const field of fields) {
        if (typeof field.semanticRole === 'string' && typeof field.key === 'string') {
          roleToFieldKey[field.semanticRole] = field.key;
        }
      }

      return {
        key: st.key,
        kind: st.semanticKind,
        ats: {
          isMandatory: (ats.isMandatory as boolean) ?? false,
          recommendedPosition: (ats.recommendedPosition as number) ?? 99,
          scoring: {
            baseScore: (scoring.baseScore as number) ?? 30,
            fieldWeights: (scoring.fieldWeights as Record<string, number>) ?? {},
          },
        },
        roleToFieldKey,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Resume-level checks (contact info, summary)
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Mandatory section checks — reads isMandatory from definitions
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Per-section scoring — reads baseScore + fieldWeights from definitions
  // ---------------------------------------------------------------------------

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
          // Density-based fallback when no weights are defined
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

  // ---------------------------------------------------------------------------
  // Content quality — checks for missing weighted fields per definition
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Overall score — weighted average of section scores minus deductions
  // ---------------------------------------------------------------------------

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
