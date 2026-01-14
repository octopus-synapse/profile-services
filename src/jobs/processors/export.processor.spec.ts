import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { ExportProcessor } from './export.processor';
import type { Job } from 'bullmq';

describe('ExportProcessor', () => {
  let processor: ExportProcessor;
  let mockResumePdfService: { generate: ReturnType<typeof mock> };
  let mockResumeDocxService: { generate: ReturnType<typeof mock> };
  let mockNotificationService: { create: ReturnType<typeof mock> };
  let mockUploadService: { uploadBuffer: ReturnType<typeof mock> };

  beforeEach(() => {
    mockResumePdfService = {
      generate: mock(() => Promise.resolve(Buffer.from('pdf-content'))),
    };
    mockResumeDocxService = {
      generate: mock(() => Promise.resolve(Buffer.from('docx-content'))),
    };
    mockNotificationService = {
      create: mock(() => Promise.resolve({ id: 'notification-123' })),
    };
    mockUploadService = {
      uploadBuffer: mock(() =>
        Promise.resolve({ url: 'https://storage.example.com/file.pdf' }),
      ),
    };

    processor = new ExportProcessor(
      mockResumePdfService as unknown as Parameters<
        (typeof ExportProcessor.prototype)['constructor']
      >[0],
      mockResumeDocxService as unknown as Parameters<
        (typeof ExportProcessor.prototype)['constructor']
      >[1],
      mockNotificationService as unknown as Parameters<
        (typeof ExportProcessor.prototype)['constructor']
      >[2],
      mockUploadService as unknown as Parameters<
        (typeof ExportProcessor.prototype)['constructor']
      >[3],
    );
  });

  describe('process', () => {
    const createMockJob = (data: Record<string, unknown>): Job =>
      ({
        id: 'job-123',
        data,
        attemptsMade: 0,
        opts: { attempts: 3 },
        updateProgress: mock(() => Promise.resolve()),
      }) as unknown as Job;

    describe('PDF Export', () => {
      it('should generate PDF and upload', async () => {
        const job = createMockJob({
          type: 'pdf',
          resumeId: 'resume-123',
          userId: 'user-456',
        });

        const result = await processor.process(job);

        expect(mockResumePdfService.generate).toHaveBeenCalledWith(
          'resume-123',
        );
        expect(mockUploadService.uploadBuffer).toHaveBeenCalled();
        expect(result).toEqual({
          downloadUrl: 'https://storage.example.com/file.pdf',
        });
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

        expect(mockNotificationService.create).toHaveBeenCalledWith(
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

        expect(mockResumeDocxService.generate).toHaveBeenCalledWith(
          'resume-123',
        );
        expect(result).toEqual({
          downloadUrl: 'https://storage.example.com/file.pdf',
        });
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

        mockResumePdfService.generate = mock(() =>
          Promise.reject(new Error('Generation failed')),
        );

        await expect(processor.process(job)).rejects.toThrow(
          'Generation failed',
        );

        expect(mockNotificationService.create).toHaveBeenCalledWith(
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

        mockResumePdfService.generate = mock(() =>
          Promise.reject(new Error('Temporary failure')),
        );

        await expect(processor.process(job)).rejects.toThrow();

        expect(mockNotificationService.create).not.toHaveBeenCalled();
      });
    });
  });
});
