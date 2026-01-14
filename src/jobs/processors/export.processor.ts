import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import type { ExportJobData } from '../queue.service';

interface ResumePdfService {
  generate(resumeId: string): Promise<Buffer>;
}

interface ResumeDocxService {
  generate(resumeId: string): Promise<Buffer>;
}

interface NotificationService {
  create(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    actionUrl?: string;
  }): Promise<{ id: string }>;
}

interface UploadService {
  uploadBuffer(
    buffer: Buffer,
    filename: string,
    contentType: string,
  ): Promise<{ url: string }>;
}

export interface ExportResult {
  downloadUrl: string;
}

@Injectable()
@Processor('export', {
  concurrency: 5,
  limiter: {
    max: 10,
    duration: 1000,
  },
})
export class ExportProcessor extends WorkerHost {
  private readonly logger = new Logger(ExportProcessor.name);

  constructor(
    private readonly resumePdfService: ResumePdfService,
    private readonly resumeDocxService: ResumeDocxService,
    private readonly notificationService: NotificationService,
    private readonly uploadService: UploadService,
  ) {
    super();
  }

  async process(job: Job<ExportJobData>): Promise<ExportResult> {
    const { type, resumeId, userId } = job.data;

    this.logger.log(`Processing export job ${job.id}: ${type} for resume ${resumeId}`);

    try {
      await job.updateProgress(10);

      let buffer: Buffer;
      let contentType: string;
      let extension: string;

      switch (type) {
        case 'pdf':
          buffer = await this.resumePdfService.generate(resumeId);
          contentType = 'application/pdf';
          extension = 'pdf';
          break;
        case 'docx':
          buffer = await this.resumeDocxService.generate(resumeId);
          contentType =
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          extension = 'docx';
          break;
        default:
          throw new Error(`Unsupported export type: ${type}`);
      }

      await job.updateProgress(60);

      const filename = `resume-${resumeId}-${Date.now()}.${extension}`;
      const uploadResult = await this.uploadService.uploadBuffer(
        buffer,
        filename,
        contentType,
      );

      await job.updateProgress(90);

      await this.notificationService.create({
        userId,
        type: 'EXPORT_COMPLETED',
        title: 'Export completed',
        message: `Your ${type.toUpperCase()} export is ready`,
        actionUrl: uploadResult.url,
      });

      await job.updateProgress(100);

      this.logger.log(`Export job ${job.id} completed successfully`);

      return { downloadUrl: uploadResult.url };
    } catch (error) {
      this.logger.error(`Export job ${job.id} failed:`, error);

      const isFinalAttempt =
        job.attemptsMade >= (job.opts.attempts ?? 3);

      if (isFinalAttempt) {
        await this.notificationService.create({
          userId,
          type: 'EXPORT_FAILED',
          title: 'Export failed',
          message: `Failed to generate ${type.toUpperCase()}: ${(error as Error).message}`,
        });
      }

      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.log(`Job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error(`Job ${job.id} failed:`, error);
  }
}
