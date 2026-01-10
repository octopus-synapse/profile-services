/**
 * ResumeAnalyticsController Unit Tests
 *
 * TDD tests for REST API endpoints.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { ResumeAnalyticsController } from './resume-analytics.controller';
import { ResumeAnalyticsService } from '../services/resume-analytics.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type {
  ATSIssue,
  AnalyticsSnapshot,
  ScoreProgression,
} from '../interfaces';

describe('ResumeAnalyticsController', () => {
  let controller: ResumeAnalyticsController;
  let mockService: Record<string, (...args: unknown[]) => Promise<unknown>>;

  const mockUser = { id: 'user-123', email: 'test@example.com' };

  const mockViewStats = {
    totalViews: 150,
    uniqueVisitors: 80,
    viewsByDay: [
      { date: '2024-01-01', count: 10 },
      { date: '2024-01-02', count: 15 },
    ],
    topSources: [{ source: 'linkedin', count: 50, percentage: 33 }],
  };

  const mockATSScore = {
    score: 85,
    breakdown: { keywords: 80, format: 90, completeness: 85, experience: 85 },
    issues: [
      { type: 'short_summary', severity: 'medium', message: 'Expand summary' },
    ] as ATSIssue[],
    recommendations: ['Expand your professional summary'],
  };

  const mockKeywords = {
    existingKeywords: [{ keyword: 'TypeScript', count: 5, relevance: 100 }],
    missingKeywords: ['AWS', 'Docker'],
    keywordDensity: 3.5,
    warnings: [],
    recommendations: ['Consider adding AWS keywords'],
  };

  const mockJobMatch = {
    matchScore: 75,
    matchedKeywords: ['React', 'TypeScript'],
    missingKeywords: ['AWS', 'Kubernetes'],
    partialMatches: [],
    recommendations: ['Add cloud infrastructure skills'],
  };

  const mockBenchmark = {
    percentile: 78,
    totalInIndustry: 100,
    comparison: {
      avgATSScore: 70,
      yourATSScore: 85,
      avgViews: 100,
      yourViews: 150,
      avgSkillsCount: 8,
      yourSkillsCount: 12,
      avgExperienceYears: 5,
      yourExperienceYears: 7,
    },
    topPerformers: {
      commonSkills: ['TypeScript', 'React', 'AWS'],
      avgExperienceYears: 8,
      avgSkillsCount: 15,
      commonCertifications: [],
    },
    recommendations: [
      {
        type: 'skill' as const,
        priority: 'medium' as const,
        message: 'Add trending skills',
        action: 'Research job postings',
      },
    ],
  };

  const mockDashboard = {
    resumeId: 'resume-123',
    overview: {
      totalViews: 150,
      uniqueVisitors: 80,
      atsScore: 85,
      keywordScore: 78,
      industryPercentile: 78,
    },
    viewTrend: [] as Array<{ date: string; count: number }>,
    topSources: [] as Array<{ source: string; count: number }>,
    keywordHealth: {
      score: 78,
      topKeywords: ['TypeScript', 'React'],
      missingCritical: ['AWS'],
    },
    industryPosition: { percentile: 78, trend: 'improving' as const },
    recommendations: [] as Array<{
      type: string;
      priority: string;
      message: string;
    }>,
  };

  const mockSnapshot: AnalyticsSnapshot = {
    id: 'snapshot-123',
    resumeId: 'resume-123',
    atsScore: 85,
    keywordScore: 78,
    completenessScore: 90,
    topKeywords: ['TypeScript'],
    missingKeywords: ['AWS'],
    createdAt: new Date(),
  };

  const mockProgression: ScoreProgression = {
    snapshots: [],
    trend: 'stable',
    changePercent: 0,
  };

  beforeEach(async () => {
    mockService = {
      trackView: async () => undefined,
      getViewStats: async () => mockViewStats,
      calculateATSScore: async () => mockATSScore,
      getKeywordSuggestions: async () => mockKeywords,
      matchJobDescription: async () => mockJobMatch,
      getIndustryBenchmark: async () => mockBenchmark,
      getDashboard: async () => mockDashboard,
      saveSnapshot: async () => mockSnapshot,
      getHistory: async () => [mockSnapshot],
      getScoreProgression: async () => mockProgression,
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResumeAnalyticsController],
      providers: [{ provide: ResumeAnalyticsService, useValue: mockService }],
    }).compile();

    controller = module.get<ResumeAnalyticsController>(
      ResumeAnalyticsController,
    );
  });

  describe('POST /track-view', () => {
    it('should track view event and return success', async () => {
      const req = {
        ip: '192.168.1.1',
        headers: {
          'user-agent': 'Mozilla/5.0',
          referer: 'https://linkedin.com',
        },
      };
      const result = await controller.trackView(
        'resume-123',
        { resumeId: 'resume-123' },
        req as never,
      );
      expect(result.success).toBe(true);
    });

    it('should handle missing headers gracefully', async () => {
      const req = { ip: '192.168.1.1', headers: {} };
      const result = await controller.trackView(
        'resume-123',
        { resumeId: 'resume-123' },
        req as never,
      );
      expect(result.success).toBe(true);
    });
  });

  describe('GET /views', () => {
    it('should return view statistics', async () => {
      const result = await controller.getViewStats(
        'resume-123',
        { period: 'week' },
        mockUser as never,
      );
      expect(result.success).toBe(true);
      expect(result.data?.totalViews).toBe(150);
      expect(result.data?.uniqueVisitors).toBe(80);
    });
  });

  describe('GET /ats-score', () => {
    it('should return ATS score with breakdown', async () => {
      const result = await controller.getATSScore(
        'resume-123',
        mockUser as never,
      );
      expect(result.success).toBe(true);
      expect(result.data?.score).toBe(85);
      expect(result.data?.breakdown).toBeDefined();
    });

    it('should propagate ForbiddenException', async () => {
      mockService.calculateATSScore = async () => {
        throw new ForbiddenException('Not authorized');
      };
      await expect(
        controller.getATSScore('resume-123', mockUser as never),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should propagate NotFoundException', async () => {
      mockService.calculateATSScore = async () => {
        throw new NotFoundException('Resume not found');
      };
      await expect(
        controller.getATSScore('resume-123', mockUser as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET /keywords', () => {
    it('should return keyword suggestions', async () => {
      const result = await controller.getKeywordSuggestions(
        'resume-123',
        { industry: 'software_engineering' },
        mockUser as never,
      );
      expect(result.success).toBe(true);
      expect(result.data?.existingKeywords).toBeDefined();
      expect(result.data?.missingKeywords).toContain('AWS');
    });
  });

  describe('POST /match-job', () => {
    it('should match resume against job description', async () => {
      const result = await controller.matchJob(
        'resume-123',
        { jobDescription: 'Looking for React developer' },
        mockUser as never,
      );
      expect(result.success).toBe(true);
      expect(result.data?.matchScore).toBe(75);
      expect(result.data?.matchedKeywords).toContain('React');
    });
  });

  describe('GET /benchmark', () => {
    it('should return industry benchmark', async () => {
      const result = await controller.getBenchmark(
        'resume-123',
        { industry: 'software_engineering' },
        mockUser as never,
      );
      expect(result.success).toBe(true);
      expect(result.data?.percentile).toBe(78);
      expect(result.data?.comparison).toBeDefined();
    });
  });

  describe('GET /dashboard', () => {
    it('should return complete dashboard data', async () => {
      const result = await controller.getDashboard(
        'resume-123',
        mockUser as never,
      );
      expect(result.success).toBe(true);
      expect(result.data?.resumeId).toBe('resume-123');
      expect(result.data?.overview?.atsScore).toBe(85);
    });
  });

  describe('POST /snapshot', () => {
    it('should create analytics snapshot', async () => {
      const result = await controller.createSnapshot(
        'resume-123',
        mockUser as never,
      );
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('snapshot-123');
    });
  });

  describe('GET /history', () => {
    it('should return analytics history', async () => {
      const result = await controller.getHistory(
        'resume-123',
        { limit: 10 },
        mockUser as never,
      );
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('GET /progression', () => {
    it('should return score progression', async () => {
      const result = await controller.getProgression(
        'resume-123',
        mockUser as never,
      );
      expect(result.success).toBe(true);
      expect(result.data?.trend).toBe('stable');
    });
  });
});
