import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';

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

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 2000,
  },
  removeOnComplete: {
    age: 24 * 3600,
    count: 1000,
  },
  removeOnFail: {
    age: 7 * 24 * 3600,
  },
};

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('export') private readonly exportQueue: Queue,
    @InjectQueue('email') private readonly emailQueue: Queue,
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
