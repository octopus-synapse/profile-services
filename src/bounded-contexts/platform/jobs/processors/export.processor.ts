import { UnsupportedExportFormatException } from '@/bounded-contexts/export/domain/exceptions/export.exceptions';
import type { LoggerPort } from '@/shared-kernel';
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
  uploadBuffer(buffer: Buffer, filename: string, contentType: string): Promise<{ url: string }>;
}

export interface ExportResult {
  downloadUrl: string;
}

/**
 * Job describing the BullMQ-shaped contract this processor consumes.
 * We deliberately don't import `Job` from `bullmq` so the processor
 * stays framework-agnostic — adapters are expected to call into
 * `process` with a structurally-compatible value.
 */
export interface ExportJob {
  readonly id?: string;
  readonly data: ExportJobData;
  attemptsMade: number;
  opts: { attempts?: number };
  updateProgress(value: number): Promise<unknown>;
}

const CTX = 'ExportProcessor';

/**
 * Framework-free POJO. When this processor is wired against a real
 * queue, register it via `JobQueuePort.register('export', ...)` from
 * the owning module's composition.
 */
export class ExportProcessor {
  constructor(
    private readonly resumePdfService: ResumePdfService,
    private readonly resumeDocxService: ResumeDocxService,
    private readonly notificationService: NotificationService,
    private readonly uploadService: UploadService,
    private readonly logger?: LoggerPort,
  ) {}

  async process(job: ExportJob): Promise<ExportResult> {
    const { type, resumeId, userId } = job.data;

    this.logger?.log(`Processing export job ${job.id}: ${type} for resume ${resumeId}`, CTX);

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
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          extension = 'docx';
          break;
        default:
          throw new UnsupportedExportFormatException(type);
      }

      await job.updateProgress(60);

      const filename = `resume-${resumeId}-${Date.now()}.${extension}`;
      const uploadResult = await this.uploadService.uploadBuffer(buffer, filename, contentType);

      await job.updateProgress(90);

      await this.notificationService.create({
        userId,
        type: 'EXPORT_COMPLETED',
        title: 'Export completed',
        message: `Your ${type.toUpperCase()} export is ready`,
        actionUrl: uploadResult.url,
      });

      await job.updateProgress(100);

      this.logger?.log(`Export job ${job.id} completed successfully`, CTX);

      return { downloadUrl: uploadResult.url };
    } catch (error) {
      this.logger?.error(
        `Export job ${job.id} failed: ${(error as Error).message}`,
        (error as Error).stack,
        CTX,
      );

      const isFinalAttempt = job.attemptsMade >= (job.opts.attempts ?? 3);

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
}
