import dgram from 'node:dgram';
import type { Lifecycle } from '@/shared-kernel/lifecycle';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';

const MAX_PACKET_BYTES = 8_192;

export interface DogStatsdClientOptions {
  readonly enabled: boolean;
  readonly host: string;
  readonly port: number;
  readonly namespace?: string;
  readonly constantTags?: ReadonlyArray<string>;
}

export class DogStatsdClient implements Lifecycle {
  private socket?: dgram.Socket;

  constructor(
    private readonly options: DogStatsdClientOptions,
    private readonly logger: LoggerPort,
  ) {}

  async init(): Promise<void> {
    if (!this.options.enabled) return;
    this.socket = dgram.createSocket('udp4');
    this.socket.unref();
    this.logger.log(
      `DogStatsD telemetry enabled (${this.options.host}:${this.options.port})`,
      'DogStatsdClient',
    );
  }

  async dispose(): Promise<void> {
    if (!this.socket) return;
    await new Promise<void>((resolve) => {
      this.socket?.close(() => resolve());
    });
    this.socket = undefined;
  }

  increment(name: string, value = 1, tags: ReadonlyArray<string> = []): void {
    this.sendMetric(name, value, 'c', tags);
  }

  histogram(name: string, value: number, tags: ReadonlyArray<string> = []): void {
    this.sendMetric(name, value, 'h', tags);
  }

  gauge(name: string, value: number, tags: ReadonlyArray<string> = []): void {
    this.sendMetric(name, value, 'g', tags);
  }

  event(title: string, text: string, tags: ReadonlyArray<string> = []): void {
    const safeTitle = sanitizeEventField(title, 100);
    const safeText = sanitizeEventField(text, 4_000);
    const tagSuffix = this.formatTags(tags);
    this.send(
      `_e{${Buffer.byteLength(safeTitle)},${Buffer.byteLength(safeText)}}:${safeTitle}|${safeText}${tagSuffix}`,
    );
  }

  private sendMetric(
    name: string,
    value: number,
    type: 'c' | 'g' | 'h',
    tags: ReadonlyArray<string>,
  ): void {
    const metricName = `${this.options.namespace ?? ''}${sanitizeMetricName(name)}`;
    this.send(`${metricName}:${value}|${type}${this.formatTags(tags)}`);
  }

  private formatTags(tags: ReadonlyArray<string>): string {
    const allTags = [...(this.options.constantTags ?? []), ...tags]
      .map(sanitizeTag)
      .filter((tag) => tag.length > 0);
    return allTags.length > 0 ? `|#${allTags.join(',')}` : '';
  }

  private send(line: string): void {
    if (!this.options.enabled || !this.socket) return;
    const payload = Buffer.from(line.slice(0, MAX_PACKET_BYTES));
    this.socket.send(payload, this.options.port, this.options.host, (err) => {
      if (!err) return;
      this.logger.warn('DogStatsD packet send failed', 'DogStatsdClient', {
        reason: err.message,
      });
    });
  }
}

export function tag(key: string, value: string | number | boolean | undefined): string | undefined {
  if (value === undefined || value === '') return undefined;
  return `${sanitizeTagPart(key)}:${sanitizeTagPart(String(value))}`;
}

function sanitizeMetricName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_.]/gu, '_');
}

function sanitizeTag(raw: string | undefined): string {
  if (!raw) return '';
  const [key, ...rest] = raw.split(':');
  if (!key) return '';
  const value = rest.join(':');
  if (!value) return sanitizeTagPart(key);
  return `${sanitizeTagPart(key)}:${sanitizeTagPart(value)}`;
}

function sanitizeTagPart(value: string): string {
  return value
    .trim()
    .replace(/[\s,|]+/gu, '_')
    .replace(/[^\w.:\-/]+/gu, '_')
    .slice(0, 200);
}

function sanitizeEventField(value: string, maxLength: number): string {
  return value.replace(/\r?\n/gu, ' ').replace(/\|/gu, '/').slice(0, maxLength);
}
