import type { PrismaClient } from '@prisma/client';
import { startTestApp, type TestApp, type TestRequest } from './index';

/**
 * Cache wrapper around the singleton `TestApp` returned by
 * `startTestApp()`.
 *
 * Both integration/setup.ts and e2e/setup.ts grew the same
 * `cachedAppRef + onChange` pattern (build helpers when the underlying
 * TestApp instance changes). Centralised here so test bootstrap files
 * stop reimplementing it — see Q58 in the duplication audit.
 */
export class TestAppCache {
  private app: TestApp | null = null;
  private listeners: Array<(app: TestApp) => void> = [];

  async getApp(): Promise<TestApp> {
    const next = await startTestApp();
    if (this.app !== next) {
      this.app = next;
      for (const fn of this.listeners) fn(next);
    }
    return this.app;
  }

  getRequest(): TestRequest {
    if (!this.app) throw new Error('App not initialized. Call getApp() first.');
    return this.app.request;
  }

  getPrisma(): PrismaClient {
    if (!this.app) throw new Error('App not initialized. Call getApp() first.');
    return this.app.prisma;
  }

  /** Run `fn` whenever a fresh TestApp instance is returned. */
  onChange(fn: (app: TestApp) => void): void {
    this.listeners.push(fn);
  }

  reset(): void {
    this.app = null;
  }
}
