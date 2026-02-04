/**
 * GitHub Achievement Service Tests
 * Focus: Achievement generation based on GitHub stats
 *
 * Key scenarios:
 * - Stars threshold (100+) generates achievement
 * - Repos threshold (20+) generates achievement
 * - Below thresholds generates no achievements
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { GitHubAchievementService } from './github-achievement.service';
import type { GitHubUser } from '../types/github.types';

describe('GitHubAchievementService', () => {
  let service: GitHubAchievementService;

  const baseProfile: GitHubUser = {
    id: 123456,
    login: 'testuser',
    avatar_url: 'https://avatars.githubusercontent.com/u/123456',
    html_url: 'https://github.com/testuser',
    name: 'Test User',
    bio: 'A developer',
    public_repos: 5,
    followers: 10,
    following: 20,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GitHubAchievementService],
    }).compile();

    service = module.get<GitHubAchievementService>(GitHubAchievementService);
  });

  describe('generateAchievements', () => {
    it('should generate stars achievement when above threshold (100+)', () => {
      const result = service.generateAchievements(
        'resume-123',
        'testuser',
        { ...baseProfile, public_repos: 5 },
        150,
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('github_stars');
      expect(result[0].title).toBe('150+ GitHub Stars');
      expect(result[0].value).toBe(150);
      expect(result[0].resumeId).toBe('resume-123');
    });

    it('should generate repos achievement when above threshold (20+)', () => {
      const result = service.generateAchievements(
        'resume-123',
        'testuser',
        { ...baseProfile, public_repos: 25 },
        50,
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('custom');
      expect(result[0].title).toBe('25 Public Repositories');
      expect(result[0].value).toBe(25);
    });

    it('should generate both achievements when both thresholds met', () => {
      const result = service.generateAchievements(
        'resume-123',
        'testuser',
        { ...baseProfile, public_repos: 30 },
        200,
      );

      expect(result).toHaveLength(2);
      const types = result.map((a) => a.type);
      expect(types).toContain('github_stars');
      expect(types).toContain('custom');
    });

    it('should generate no achievements when below all thresholds', () => {
      const result = service.generateAchievements(
        'resume-123',
        'testuser',
        { ...baseProfile, public_repos: 10 },
        50,
      );

      expect(result).toHaveLength(0);
    });

    it('should include correct verification URLs', () => {
      const result = service.generateAchievements(
        'resume-123',
        'testuser',
        { ...baseProfile, public_repos: 25 },
        150,
      );

      const starsAchievement = result.find((a) => a.type === 'github_stars');
      const reposAchievement = result.find((a) => a.type === 'custom');

      expect(starsAchievement?.verificationUrl).toBe(
        'https://github.com/testuser',
      );
      expect(reposAchievement?.verificationUrl).toBe(
        'https://github.com/testuser?tab=repositories',
      );
    });

    it('should set achievedAt to current date', () => {
      const before = new Date();

      const result = service.generateAchievements(
        'resume-123',
        'testuser',
        { ...baseProfile, public_repos: 5 },
        100,
      );

      const after = new Date();

      expect(result[0].achievedAt).toBeInstanceOf(Date);
      expect((result[0].achievedAt as Date).getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect((result[0].achievedAt as Date).getTime()).toBeLessThanOrEqual(
        after.getTime(),
      );
    });
  });
});
