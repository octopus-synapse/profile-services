import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { QueueService } from './queue.service';

describe('QueueService', () => {
  let service: QueueService;
  let mockExportQueue: {
    add: ReturnType<typeof mock>;
    getJob: ReturnType<typeof mock>;
  };
  let mockEmailQueue: {
    add: ReturnType<typeof mock>;
    getJob: ReturnType<typeof mock>;
  };

  beforeEach(() => {
    mockExportQueue = {
      add: mock(() =>
        Promise.resolve({ id: 'job-123', name: 'generate-pdf' }),
      ),
      getJob: mock(() =>
        Promise.resolve({
          id: 'job-123',
          getState: () => Promise.resolve('completed'),
          progress: 100,
          returnvalue: { downloadUrl: 'https://example.com/file.pdf' },
        }),
      ),
    };

    mockEmailQueue = {
      add: mock(() =>
        Promise.resolve({ id: 'email-job-123', name: 'send-email' }),
      ),
      getJob: mock(() => Promise.resolve(null)),
    };

    service = new QueueService(
      mockExportQueue as unknown as Parameters<
        typeof QueueService.prototype['constructor']
      >[0],
      mockEmailQueue as unknown as Parameters<
        typeof QueueService.prototype['constructor']
      >[1],
    );
  });

  describe('Export Jobs', () => {
    describe('queueExportJob', () => {
      it('should add PDF export job to queue', async () => {
        const result = await service.queueExportJob({
          type: 'pdf',
          resumeId: 'resume-123',
          userId: 'user-456',
        });

        expect(result.jobId).toBe('job-123');
        expect(mockExportQueue.add).toHaveBeenCalledWith(
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

        expect(mockExportQueue.add).toHaveBeenCalledWith(
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

        expect(mockExportQueue.add).toHaveBeenCalledWith(
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
        const status = await service.getExportJobStatus('job-123');

        expect(status.jobId).toBe('job-123');
        expect(status.status).toBe('completed');
        expect(status.progress).toBe(100);
        expect(status.result).toEqual({
          downloadUrl: 'https://example.com/file.pdf',
        });
      });

      it('should return null for non-existent job', async () => {
        mockExportQueue.getJob = mock(() => Promise.resolve(null));

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

        expect(result.jobId).toBe('email-job-123');
        expect(mockEmailQueue.add).toHaveBeenCalledWith(
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

        expect(mockEmailQueue.add).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Object),
          expect.objectContaining({ priority: 1 }),
        );
      });
    });
  });
});
