/**
 * ExportProcessor Unit Tests
 *
 * Clean Architecture tests using in-memory implementations.
 * Tests the job processor for PDF and DOCX exports.
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import type { Job } from 'bullmq';
import { ExportProcessor } from './export.processor';

// ============================================================================
// In-Memory Service Implementations
// ============================================================================

class InMemoryResumePdfService {
  private shouldFail = false;
  private content: Buffer<ArrayBufferLike> = Buffer.from('pdf-content');

  readonly generate = mock(async (_resumeId: string): Promise<Buffer> => {
    if (this.shouldFail) {
      throw new Error('Generation failed');
    }
    return this.content;
  });

  setContent(content: Buffer): void {
    this.content = content;
  }

  setFailure(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  clear(): void {
    this.shouldFail = false;
    this.content = Buffer.from('pdf-content');
    this.generate.mockClear();
  }
}

class InMemoryResumeDocxService {
  private shouldFail = false;
  private content: Buffer<ArrayBufferLike> = Buffer.from('docx-content');

  readonly generate = mock(async (_resumeId: string): Promise<Buffer> => {
    if (this.shouldFail) {
      throw new Error('Generation failed');
    }
    return this.content;
  });

  setContent(content: Buffer): void {
    this.content = content;
  }

  setFailure(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  clear(): void {
    this.shouldFail = false;
    this.content = Buffer.from('docx-content');
    this.generate.mockClear();
  }
}

class InMemoryNotificationService {
  private notifications: Array<{
    userId: string;
    type: string;
    title: string;
    message: string;
    actionUrl?: string;
  }> = [];

  readonly create = mock(
    async (data: {
      userId: string;
      type: string;
      title: string;
      message: string;
      actionUrl?: string;
    }): Promise<{ id: string }> => {
      this.notifications.push(data);
      return { id: `notification-${Date.now()}` };
    },
  );

  getNotifications(): typeof this.notifications {
    return [...this.notifications];
  }

  clear(): void {
    this.notifications = [];
    this.create.mockClear();
  }
}

class InMemoryUploadService {
  private uploads: Array<{ filename: string; contentType: string }> = [];
  private urlPrefix = 'https://storage.example.com/';

  readonly uploadBuffer = mock(
    async (_buffer: Buffer, filename: string, contentType: string): Promise<{ url: string }> => {
      this.uploads.push({ filename, contentType });
      return { url: `${this.urlPrefix}${filename}` };
    },
  );

  getUploads(): typeof this.uploads {
    return [...this.uploads];
  }

  clear(): void {
    this.uploads = [];
    this.uploadBuffer.mockClear();
  }
}

// ============================================================================
// Test Factory
// ============================================================================

const _RESUME_PDF_SERVICE = Symbol('RESUME_PDF_SERVICE');
const _RESUME_DOCX_SERVICE = Symbol('RESUME_DOCX_SERVICE');
const _NOTIFICATION_SERVICE = Symbol('NOTIFICATION_SERVICE');
const _UPLOAD_SERVICE = Symbol('UPLOAD_SERVICE');

describe('ExportProcessor', () => {
  let processor: ExportProcessor;
  let pdfService: InMemoryResumePdfService;
  let docxService: InMemoryResumeDocxService;
  let notificationService: InMemoryNotificationService;
  let uploadService: InMemoryUploadService;

  const setupProcessor = async () => {
    pdfService = new InMemoryResumePdfService();
    docxService = new InMemoryResumeDocxService();
    notificationService = new InMemoryNotificationService();
    uploadService = new InMemoryUploadService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ExportProcessor,
          useFactory: () =>
            new ExportProcessor(pdfService, docxService, notificationService, uploadService),
        },
        {
          provide: getQueueToken('export'),
          useValue: { add: mock() },
        },
      ],
    }).compile();

    processor = module.get<ExportProcessor>(ExportProcessor);
  };

  beforeEach(async () => {
    await setupProcessor();
  });

  // Factory for creating mock Job objects
  const createMockJob = (data: Record<string, unknown>): Job => {
    const job = {
      id: 'job-123',
      data,
      attemptsMade: 0,
      opts: { attempts: 3 },
      updateProgress: mock(() => Promise.resolve()),
    };
    return job as unknown as Job;
  };

  describe('process', () => {
    describe('PDF Export', () => {
      it('should generate PDF and upload', async () => {
        const job = createMockJob({
          type: 'pdf',
          resumeId: 'resume-123',
          userId: 'user-456',
        });

        const result = await processor.process(job);

        expect(pdfService.generate).toHaveBeenCalledWith('resume-123');
        expect(uploadService.uploadBuffer).toHaveBeenCalled();
        expect(result.downloadUrl).toContain('https://storage.example.com/');
      });

      it('should update progress during processing', async () => {
        const job = createMockJob({
          type: 'pdf',
          resumeId: 'resume-123',
          userId: 'user-456',
        });

        await processor.process(job);

        expect(job.updateProgress).toHaveBeenCalled();
      });

      it('should send notification on success', async () => {
        const job = createMockJob({
          type: 'pdf',
          resumeId: 'resume-123',
          userId: 'user-456',
        });

        await processor.process(job);

        expect(notificationService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-456',
            type: 'EXPORT_COMPLETED',
          }),
        );
      });
    });

    describe('DOCX Export', () => {
      it('should generate DOCX and upload', async () => {
        const job = createMockJob({
          type: 'docx',
          resumeId: 'resume-123',
          userId: 'user-456',
        });

        const result = await processor.process(job);

        expect(docxService.generate).toHaveBeenCalledWith('resume-123');
        expect(result.downloadUrl).toContain('https://storage.example.com/');
      });
    });

    describe('Error Handling', () => {
      it('should send failure notification on final attempt', async () => {
        const job = createMockJob({
          type: 'pdf',
          resumeId: 'resume-123',
          userId: 'user-456',
        });
        job.attemptsMade = 3;
        job.opts.attempts = 3;

        pdfService.setFailure(true);

        await expect(processor.process(job)).rejects.toThrow('Generation failed');

        expect(notificationService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-456',
            type: 'EXPORT_FAILED',
          }),
        );
      });

      it('should not send failure notification on retryable attempt', async () => {
        const job = createMockJob({
          type: 'pdf',
          resumeId: 'resume-123',
          userId: 'user-456',
        });
        job.attemptsMade = 1;
        job.opts.attempts = 3;

        pdfService.setFailure(true);

        await expect(processor.process(job)).rejects.toThrow();

        expect(notificationService.create).not.toHaveBeenCalled();
      });
    });
  });
});
