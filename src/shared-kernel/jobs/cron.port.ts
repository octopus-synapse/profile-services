/**
 * Framework-free cron port. Replaces `@nestjs/schedule`'s `@Cron`
 * decorator. Composition registers handlers via
 * `cron.register({ pattern: '0 9 * * *', tz: 'America/Sao_Paulo' }, h)`.
 *
 * The Nest adapter implements this on top of `SchedulerRegistry` /
 * `@Cron`. Future framework adapters can use any cron lib —
 * `node-cron`, `bullmq` repeat, etc.
 */

export interface CronSpec {
  readonly pattern: string;
  readonly tz?: string;
}

export type CronHandler = () => Promise<void>;

export abstract class CronPort {
  abstract register(spec: CronSpec, handler: CronHandler): void;
}
