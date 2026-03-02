import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { PublicResumeController } from './public-resume.controller';
import { ShareAnalyticsService } from '@/bounded-contexts/analytics/share-analytics/services/share-analytics.service';
import { ResumeShareService } from '../services/resume-share.service';

const createShareService = () => ({
  getBySlug: mock(() => Promise.resolve({
    id: 'share-1',
    slug: 'my-resume',
    resumeId: 'resume-1',
    password: null,
    expiresAt: null,
  })),
  verifyPassword: mock(() => Promise.resolve(true)),
  getResumeWithCache: mock(() => Promise.resolve({ id: 'resume-1', title: 'Resume' })),
});

const createAnalyticsService = () => ({
  trackEvent: mock(() => Promise.resolve()),
});

const mockRequest = {
  headers: {
    'x-forwarded-for': '127.0.0.1',
    'user-agent': 'test-agent',
    referer: 'https://example.com',
  },
  socket: { remoteAddress: '127.0.0.1' },
} as any;

describe('PublicResumeController - Contract', () => {
  let controller: PublicResumeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicResumeController],
      providers: [
        { provide: ResumeShareService, useValue: createShareService() },
        { provide: ShareAnalyticsService, useValue: createAnalyticsService() },
      ],
    }).compile();

    controller = module.get<PublicResumeController>(PublicResumeController);
  });

  it('getPublicResume returns data with resume and share', async () => {
    const result = await controller.getPublicResume('my-resume', undefined, mockRequest);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('resume');
    expect(result.data).toHaveProperty('share');
  });

  it('downloadPublicResume returns data with resume and share', async () => {
    const result = await controller.downloadPublicResume('my-resume', undefined, mockRequest);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('resume');
    expect(result.data).toHaveProperty('share');
  });
});
