import { describe, expect, it } from 'bun:test';
import type { DomainEvent } from '@/shared-kernel/event-bus/domain';
import { type EventPublisher, EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import { ExportPipelineFailedException } from '../../domain/exceptions/export.exceptions';
import { ExportPipelineService } from './export-pipeline.service';

class RecordingEventPublisher extends EventPublisherPort {
  readonly published: DomainEvent<unknown>[] = [];
  publish<T>(event: DomainEvent<T>): void {
    this.published.push(event);
  }
  async publishAsync<T>(event: DomainEvent<T>): Promise<void> {
    this.published.push(event);
  }
}

const asPublisher = (r: RecordingEventPublisher) => r as unknown as EventPublisher;

describe('ExportPipelineService', () => {
  describe('run', () => {
    it('emits Requested then Completed when the task succeeds', async () => {
      const events = new RecordingEventPublisher();
      const pipeline = new ExportPipelineService(asPublisher(events));

      const result = await pipeline.run('pdf', 'user-1', async () => 'ok');

      expect(result).toBe('ok');
      expect(events.published).toHaveLength(2);
      expect(events.published[0]?.constructor.name).toBe('ExportRequestedEvent');
      expect(events.published[1]?.constructor.name).toBe('ExportCompletedEvent');
    });

    it('emits Failed and throws ExportPipelineFailedException when the task throws', async () => {
      const events = new RecordingEventPublisher();
      const pipeline = new ExportPipelineService(asPublisher(events));

      const promise = pipeline.run('pdf', 'user-1', async () => {
        throw new Error('boom');
      });

      await expect(promise).rejects.toBeInstanceOf(ExportPipelineFailedException);
      expect(events.published[1]?.constructor.name).toBe('ExportFailedEvent');
    });
  });

  describe('runBanner', () => {
    it('returns the buffer on success without emitting events', async () => {
      const events = new RecordingEventPublisher();
      const pipeline = new ExportPipelineService(asPublisher(events));
      const buf = Buffer.from([1, 2, 3]);

      const result = await pipeline.runBanner(async () => buf);

      expect(result).toBe(buf);
      expect(events.published).toHaveLength(0);
    });

    it('rethrows failures as ExportPipelineFailedException("banner")', async () => {
      const events = new RecordingEventPublisher();
      const pipeline = new ExportPipelineService(asPublisher(events));

      const promise = pipeline.runBanner(async () => {
        throw new Error('render fail');
      });

      await expect(promise).rejects.toBeInstanceOf(ExportPipelineFailedException);
    });
  });
});
