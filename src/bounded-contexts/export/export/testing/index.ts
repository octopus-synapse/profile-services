/**
 * Export Testing Module
 *
 * In-memory implementations for testing export functionality.
 */

export interface BannerCapturePort {
  capture(palette?: string, logoUrl?: string): Promise<Buffer>;
}

export interface ResumePDFPort {
  generatePDF(options?: {
    resumeId?: string;
    userId?: string;
    palette?: string;
    lang?: string;
    bannerColor?: string;
  }): Promise<Buffer>;
}

export interface ResumeDOCXPort {
  generateDOCX(options?: { resumeId?: string; userId?: string }): Promise<Buffer>;
}

export interface ResumeJsonPort {
  exportAsJson(resumeId: string, options?: { format?: 'jsonresume' | 'profile' }): Promise<object>;
  exportAsBuffer(resumeId: string): Promise<Buffer>;
}

/**
 * In-Memory Banner Capture Service
 */
export class InMemoryBannerCapture implements BannerCapturePort {
  private buffer: Buffer = Buffer.from('mock-png-content') as Buffer;
  private shouldFail = false;
  private error: Error | null = null;

  async capture(_palette?: string, _logoUrl?: string): Promise<Buffer> {
    if (this.shouldFail && this.error) {
      throw this.error;
    }
    return this.buffer;
  }

  // Test helpers
  setBuffer(buffer: Buffer): void {
    this.buffer = buffer;
  }

  setFailure(error: Error): void {
    this.shouldFail = true;
    this.error = error;
  }

  reset(): void {
    this.buffer = Buffer.from('mock-png-content') as Buffer;
    this.shouldFail = false;
    this.error = null;
  }
}

/**
 * In-Memory Resume PDF Service
 */
export class InMemoryResumePDF implements ResumePDFPort {
  private buffer: Buffer = Buffer.from('mock-pdf-content') as Buffer;
  private shouldFail = false;
  private error: Error | null = null;

  async generatePDF(_options?: {
    resumeId?: string;
    userId?: string;
    palette?: string;
    lang?: string;
    bannerColor?: string;
  }): Promise<Buffer> {
    if (this.shouldFail && this.error) {
      throw this.error;
    }
    return this.buffer;
  }

  // Test helpers
  setBuffer(buffer: Buffer): void {
    this.buffer = buffer;
  }

  setFailure(error: Error): void {
    this.shouldFail = true;
    this.error = error;
  }

  reset(): void {
    this.buffer = Buffer.from('mock-pdf-content') as Buffer;
    this.shouldFail = false;
    this.error = null;
  }
}

/**
 * In-Memory Resume DOCX Service
 */
export class InMemoryResumeDOCX implements ResumeDOCXPort {
  private buffer: Buffer = Buffer.from('mock-docx-content') as Buffer;
  private shouldFail = false;
  private error: Error | null = null;

  async generateDOCX(_options?: { resumeId?: string; userId?: string }): Promise<Buffer> {
    if (this.shouldFail && this.error) {
      throw this.error;
    }
    return this.buffer;
  }

  // Test helpers
  setBuffer(buffer: Buffer): void {
    this.buffer = buffer;
  }

  setFailure(error: Error): void {
    this.shouldFail = true;
    this.error = error;
  }

  reset(): void {
    this.buffer = Buffer.from('mock-docx-content') as Buffer;
    this.shouldFail = false;
    this.error = null;
  }
}

/**
 * In-Memory Resume JSON Service
 */
export class InMemoryResumeJson implements ResumeJsonPort {
  private resumes = new Map<string, object>();
  private shouldFail = false;
  private error: Error | null = null;

  async exportAsJson(
    resumeId: string,
    options?: { format?: 'jsonresume' | 'profile' },
  ): Promise<object> {
    if (this.shouldFail && this.error) {
      throw this.error;
    }

    const resume = this.resumes.get(resumeId);
    if (!resume) {
      throw new Error('Resume not found');
    }

    if (options?.format === 'profile') {
      return {
        format: 'profile',
        version: '1.0',
        resume,
      };
    }

    return {
      $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
      ...resume,
    };
  }

  async exportAsBuffer(resumeId: string): Promise<Buffer> {
    const json = await this.exportAsJson(resumeId);
    return Buffer.from(JSON.stringify(json, null, 2));
  }

  // Test helpers
  seedResume(id: string, data: object): void {
    this.resumes.set(id, data);
  }

  setFailure(error: Error): void {
    this.shouldFail = true;
    this.error = error;
  }

  reset(): void {
    this.resumes.clear();
    this.shouldFail = false;
    this.error = null;
  }
}

/**
 * Null Logger for testing
 */
export class NullLogger {
  setContext(_context: string): void {}
  log(_message: string): void {}
  error(_message: string): void {}
  errorWithMeta(_message: string, _meta: object): void {}
  warn(_message: string): void {}
  debug(_message: string): void {}
}

/**
 * Null Event Publisher for testing
 */
export class NullEventPublisher {
  publish(_event: unknown): void {}
}
