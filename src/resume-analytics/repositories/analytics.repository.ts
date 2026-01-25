/**
 * Analytics Repository
 *
 * Centralizes all Prisma operations for the resume-analytics module.
 * Encapsulates data access logic, enabling services to focus on business rules.
 *
 * @see ADR-000X — Enforce Disciplined, Persona-Aware Engineering
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ============================================================================
// Types
// ============================================================================

export interface CreateViewEventData {
  resumeId: string;
  ipHash: string;
  userAgent?: string;
  referer?: string;
  country?: string;
  city?: string;
  source: string;
}

export interface CreateAnalyticsSnapshotData {
  resumeId: string;
  atsScore: number;
  keywordScore: number;
  completenessScore: number;
  industryRank?: number;
  totalInIndustry?: number;
  topKeywords: string[];
  missingKeywords: string[];
  improvementSuggestions?: string[];
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// ============================================================================
// Repository
// ============================================================================

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // Resume Operations
  // --------------------------------------------------------------------------

  async findResumeById(resumeId: string) {
    return this.prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        skills: true,
        experiences: true,
      },
    });
  }

  async findPublicResumesByIndustry(industry: string) {
    return this.prisma.resume.findMany({
      where: {
        techArea: industry,
        isPublic: true,
      },
      include: {
        skills: true,
        experiences: true,
      },
    });
  }

  // --------------------------------------------------------------------------
  // View Event Operations
  // --------------------------------------------------------------------------

  async createViewEvent(data: CreateViewEventData) {
    return this.prisma.resumeViewEvent.create({ data });
  }

  async countViewEvents(resumeId: string, dateRange?: DateRange) {
    return this.prisma.resumeViewEvent.count({
      where: {
        resumeId,
        ...(dateRange && {
          createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        }),
      },
    });
  }

  async groupViewEventsByIpHash(resumeId: string, dateRange?: DateRange) {
    return this.prisma.resumeViewEvent.groupBy({
      by: ['ipHash'],
      where: {
        resumeId,
        ...(dateRange && {
          createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        }),
      },
    });
  }

  async findViewEventsForDateRange(resumeId: string, dateRange: DateRange) {
    return this.prisma.resumeViewEvent.findMany({
      where: {
        resumeId,
        createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
      },
      select: { createdAt: true },
    });
  }

  async groupViewEventsBySource(resumeId: string, dateRange: DateRange) {
    return this.prisma.resumeViewEvent.groupBy({
      by: ['source'],
      where: {
        resumeId,
        createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
      },
      _count: { source: true },
      orderBy: { _count: { source: 'desc' } },
      take: 10,
    });
  }

  // --------------------------------------------------------------------------
  // Analytics Snapshot Operations
  // --------------------------------------------------------------------------

  async createAnalyticsSnapshot(data: CreateAnalyticsSnapshotData) {
    return this.prisma.resumeAnalytics.create({ data });
  }

  async findAnalyticsSnapshots(
    resumeId: string,
    options: { limit?: number; orderBy?: 'asc' | 'desc' } = {},
  ) {
    return this.prisma.resumeAnalytics.findMany({
      where: { resumeId },
      orderBy: { createdAt: options.orderBy ?? 'desc' },
      take: options.limit,
    });
  }

  async findAnalyticsScoreProgression(resumeId: string) {
    return this.prisma.resumeAnalytics.findMany({
      where: { resumeId },
      orderBy: { createdAt: 'asc' },
      select: { atsScore: true, createdAt: true },
    });
  }
}
