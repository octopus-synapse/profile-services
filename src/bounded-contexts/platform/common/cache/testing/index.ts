/**
 * Cache Testing Module
 *
 * In-memory implementations for testing cache functionality.
 * Following clean architecture principles - ports and adapters.
 */

/**
 * In-Memory Cache Service for testing
 *
 * Implements the same interface as CacheService but stores data in memory.
 */
export class InMemoryCacheService {
  private cache = new Map<string, { value: unknown; expiresAt?: number }>();
  private _isEnabled = true;
  private _shouldFail = false;
  private _failureError: Error | null = null;

  get isEnabled(): boolean {
    return this._isEnabled;
  }

  async get<T>(key: string): Promise<T | null> {
    if (this._shouldFail && this._failureError) {
      throw this._failureError;
    }

    const entry = this.cache.get(key);
    if (!entry) return null;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (this._shouldFail && this._failureError) {
      throw this._failureError;
    }

    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.cache.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    if (this._shouldFail && this._failureError) {
      throw this._failureError;
    }
    this.cache.delete(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    if (this._shouldFail && this._failureError) {
      throw this._failureError;
    }

    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  async flush(): Promise<void> {
    if (this._shouldFail && this._failureError) {
      throw this._failureError;
    }
    this.cache.clear();
  }

  // Test helpers
  setEnabled(enabled: boolean): void {
    this._isEnabled = enabled;
  }

  setFailure(error: Error): void {
    this._shouldFail = true;
    this._failureError = error;
  }

  clearFailure(): void {
    this._shouldFail = false;
    this._failureError = null;
  }

  seed(key: string, value: unknown): void {
    this.cache.set(key, { value });
  }

  getAll(): Map<string, unknown> {
    const result = new Map<string, unknown>();
    for (const [key, entry] of this.cache) {
      result.set(key, entry.value);
    }
    return result;
  }

  clear(): void {
    this.cache.clear();
    this._shouldFail = false;
    this._failureError = null;
    this._isEnabled = true;
  }
}

/**
 * In-Memory Resume Repository for cache warming tests
 */
export class InMemoryResumeRepository {
  private resumes: Array<{
    id: string;
    slug: string;
    title: string | null;
    profileViews: number;
    isPublic: boolean;
  }> = [];

  async findMany(options?: {
    where?: { isPublic?: boolean };
    orderBy?: { profileViews?: 'asc' | 'desc' };
    take?: number;
  }): Promise<typeof this.resumes> {
    let results = [...this.resumes];

    if (options?.where?.isPublic !== undefined) {
      results = results.filter((r) => r.isPublic === options.where?.isPublic);
    }

    if (options?.orderBy?.profileViews === 'desc') {
      results.sort((a, b) => b.profileViews - a.profileViews);
    } else if (options?.orderBy?.profileViews === 'asc') {
      results.sort((a, b) => a.profileViews - b.profileViews);
    }

    if (options?.take) {
      results = results.slice(0, options.take);
    }

    return results;
  }

  async findUnique(options: { where: { id: string } }): Promise<(typeof this.resumes)[0] | null> {
    return this.resumes.find((r) => r.id === options.where.id) ?? null;
  }

  // Test helpers
  seed(resume: {
    id: string;
    slug: string;
    title?: string | null;
    profileViews?: number;
    isPublic?: boolean;
  }): void {
    this.resumes.push({
      id: resume.id,
      slug: resume.slug,
      title: resume.title ?? null,
      profileViews: resume.profileViews ?? 0,
      isPublic: resume.isPublic ?? true,
    });
  }

  clear(): void {
    this.resumes = [];
  }
}

/**
 * In-Memory User Repository for cache warming tests
 */
export class InMemoryUserRepository {
  private users: Array<{
    id: string;
    name: string;
    preferences?: { theme?: string };
  }> = [];

  async findMany(_options?: unknown): Promise<typeof this.users> {
    return [...this.users];
  }

  // Test helpers
  seed(user: { id: string; name: string; preferences?: { theme?: string } }): void {
    this.users.push(user);
  }

  clear(): void {
    this.users = [];
  }
}

/**
 * Stub Logger for testing
 */
export class StubLogger {
  readonly logs: string[] = [];
  readonly errors: string[] = [];
  readonly warns: string[] = [];
  readonly debugs: string[] = [];

  log(message: string, _context?: string): void {
    this.logs.push(message);
  }

  error(message: string, _trace?: string, _context?: string): void {
    this.errors.push(message);
  }

  warn(message: string, _context?: string): void {
    this.warns.push(message);
  }

  debug(message: string, _context?: string): void {
    this.debugs.push(message);
  }

  clear(): void {
    this.logs.length = 0;
    this.errors.length = 0;
    this.warns.length = 0;
    this.debugs.length = 0;
  }
}
