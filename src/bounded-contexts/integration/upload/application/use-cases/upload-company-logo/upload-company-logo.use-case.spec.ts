import { beforeEach, describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryFileStorage } from '../../../testing';
import { UploadCompanyLogoUseCase } from './upload-company-logo.use-case';

const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('UploadCompanyLogoUseCase', () => {
  let storage: InMemoryFileStorage;
  let useCase: UploadCompanyLogoUseCase;

  beforeEach(() => {
    storage = new InMemoryFileStorage();
    useCase = new UploadCompanyLogoUseCase(storage, stubLogger);
  });

  it('stores the logo under the user+resume namespace', async () => {
    const result = await useCase.execute('user-1', 'resume-9', {
      buffer: validPng,
      originalname: 'logo.png',
      mimetype: 'image/png',
      size: validPng.length,
    });

    expect(result.key).toMatch(/^logos\/user-1\/resume-9\/[a-f0-9-]+\.png$/);
  });
});
