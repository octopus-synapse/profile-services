/**
 * Queue Service
 *
 * Framework-free POJO wrapping the BullMQ-shaped contract for the
 * `export` and `email` queues. Consumers depend on this class
 * structurally — adapters can pass either real `bullmq` `Queue`s or
 * test doubles. New code should prefer the unified `JobQueuePort` for
 * fan-out + enqueue; this service exists for the few legacy call sites
 * that need queue introspection (job status / progress).
 */

export interface ExportJobData {
  type: 'pdf' | 'docx' | 'banner';
  resumeId: string;
  userId: string;
}

export interface EmailJobData {
  to: string;
  template: string;
  data: Record<string, unknown>;
}

export interface JobResult {
  jobId: string;
}

export interface JobStatus {
  jobId: string;
  status: string;
  progress: number;
  result?: Record<string, unknown>;
}

export interface JobOptions {
  priority?: number;
  delay?: number;
}

/** Structural shape the service consumes — covers both real `bullmq`
 *  `Queue`s and in-memory test doubles. */
export interface QueueLike {
  add(name: string, data: unknown, opts?: unknown): Promise<{ id: string | undefined | null }>;
  getJob(id: string): Promise<{
    id: string | undefined | null;
    progress: number | unknown;
    returnvalue?: unknown;
    getState(): Promise<string>;
  } | null>;
}

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: { age: 24 * 3600, count: 1000 },
  removeOnFail: { age: 7 * 24 * 3600 },
};

export class QueueService {
  constructor(
    private readonly exportQueue: QueueLike,
    private readonly emailQueue: QueueLike,
  ) {}

  async queueExportJob(data: ExportJobData): Promise<JobResult> {
    const jobName = `generate-${data.type}`;
    const job = await this.exportQueue.add(jobName, data, DEFAULT_JOB_OPTIONS);

    return { jobId: job.id as string };
  }

  async getExportJobStatus(jobId: string): Promise<JobStatus | null> {
    const job = await this.exportQueue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();

    return {
      jobId: job.id as string,
      status: state,
      progress: typeof job.progress === 'number' ? job.progress : 0,
      result: job.returnvalue as Record<string, unknown> | undefined,
    };
  }

  async queueEmail(data: EmailJobData, options?: JobOptions): Promise<JobResult> {
    const job = await this.emailQueue.add('send-email', data, {
      ...DEFAULT_JOB_OPTIONS,
      ...options,
    });

    return { jobId: job.id as string };
  }

  async getEmailJobStatus(jobId: string): Promise<JobStatus | null> {
    const job = await this.emailQueue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();

    return {
      jobId: job.id as string,
      status: state,
      progress: typeof job.progress === 'number' ? job.progress : 0,
      result: job.returnvalue as Record<string, unknown> | undefined,
    };
  }
}
