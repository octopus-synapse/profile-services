/**
 * QueueService Unit Tests
 *
 * Clean Architecture tests using in-memory queue implementations.
 * Tests job queuing for exports and emails.
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from './queue.service';

// ============================================================================
// In-Memory Queue Implementation
// ============================================================================

interface MockJob {
  id: string;
  name: string;
  data: unknown;
  opts: unknown;
  progress: number;
  returnvalue?: unknown;
  getState(): Promise<string>;
}

class InMemoryQueue {
  private jobs: Map<string, MockJob> = new Map();
  private jobCounter = 0;
  private defaultJobState = 'completed';
  private defaultProgress = 100;
  private defaultReturnValue: unknown = undefined;

  readonly add = mock(async (name: string, data: unknown, opts?: unknown): Promise<MockJob> => {
    const id = `job-${++this.jobCounter}`;
    const job: MockJob = {
      id,
      name,
      data,
      opts,
      progress: this.defaultProgress,
      returnvalue: this.defaultReturnValue,
      getState: async () => this.defaultJobState,
    };
    this.jobs.set(id, job);
    return job;
  });

  readonly getJob = mock(async (id: string): Promise<MockJob | null> => {
    return this.jobs.get(id) ?? null;
  });

  seedJob(job: MockJob): void {
    this.jobs.set(job.id, job);
  }

  setDefaults(options: { state?: string; progress?: number; returnValue?: unknown }): void {
    if (options.state !== undefined) this.defaultJobState = options.state;
    if (options.progress !== undefined) this.defaultProgress = options.progress;
    if (options.returnValue !== undefined) this.defaultReturnValue = options.returnValue;
  }

  clear(): void {
    this.jobs.clear();
    this.jobCounter = 0;
    this.add.mockClear();
    this.getJob.mockClear();
  }

  getJobs(): MockJob[] {
    return Array.from(this.jobs.values());
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('QueueService', () => {
  let service: QueueService;
  let exportQueue: InMemoryQueue;
  let emailQueue: InMemoryQueue;

  const setupService = async () => {
    exportQueue = new InMemoryQueue();
    emailQueue = new InMemoryQueue();

    // Set default return value for export jobs
    exportQueue.setDefaults({
      returnValue: { downloadUrl: 'https://example.com/file.pdf' },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        { provide: getQueueToken('export'), useValue: exportQueue },
        { provide: getQueueToken('email'), useValue: emailQueue },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
  };

  beforeEach(async () => {
    await setupService();
  });

  describe('Export Jobs', () => {
    describe('queueExportJob', () => {
      it('should add PDF export job to queue', async () => {
        const result = await service.queueExportJob({
          type: 'pdf',
          resumeId: 'resume-123',
          userId: 'user-456',
        });

        expect(result.jobId).toBe('job-1');
        expect(exportQueue.add).toHaveBeenCalledWith(
          'generate-pdf',
          expect.objectContaining({
            type: 'pdf',
            resumeId: 'resume-123',
            userId: 'user-456',
          }),
          expect.any(Object),
        );
      });

      it('should add DOCX export job to queue', async () => {
        await service.queueExportJob({
          type: 'docx',
          resumeId: 'resume-123',
          userId: 'user-456',
        });

        expect(exportQueue.add).toHaveBeenCalledWith(
          'generate-docx',
          expect.objectContaining({ type: 'docx' }),
          expect.any(Object),
        );
      });

      it('should set job options with retry attempts', async () => {
        await service.queueExportJob({
          type: 'pdf',
          resumeId: 'resume-123',
          userId: 'user-456',
        });

        expect(exportQueue.add).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Object),
          expect.objectContaining({
            attempts: 3,
            backoff: expect.objectContaining({
              type: 'exponential',
              delay: 2000,
            }),
          }),
        );
      });
    });

    describe('getExportJobStatus', () => {
      it('should return job status', async () => {
        // First create a job
        await service.queueExportJob({
          type: 'pdf',
          resumeId: 'resume-123',
          userId: 'user-456',
        });

        const status = await service.getExportJobStatus('job-1');

        expect(status).not.toBeNull();
        expect(status?.jobId).toBe('job-1');
        expect(status?.status).toBe('completed');
        expect(status?.progress).toBe(100);
        expect(status?.result).toEqual({
          downloadUrl: 'https://example.com/file.pdf',
        });
      });

      it('should return null for non-existent job', async () => {
        const status = await service.getExportJobStatus('non-existent');

        expect(status).toBeNull();
      });
    });
  });

  describe('Email Jobs', () => {
    describe('queueEmail', () => {
      it('should add email job to queue', async () => {
        const result = await service.queueEmail({
          to: 'user@example.com',
          template: 'welcome',
          data: { name: 'John' },
        });

        expect(result.jobId).toBe('job-1');
        expect(emailQueue.add).toHaveBeenCalledWith(
          'send-email',
          expect.objectContaining({
            to: 'user@example.com',
            template: 'welcome',
            data: { name: 'John' },
          }),
          expect.any(Object),
        );
      });

      it('should support priority emails', async () => {
        await service.queueEmail(
          {
            to: 'user@example.com',
            template: 'password-reset',
            data: {},
          },
          { priority: 1 },
        );

        expect(emailQueue.add).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Object),
          expect.objectContaining({ priority: 1 }),
        );
      });
    });
  });
});
