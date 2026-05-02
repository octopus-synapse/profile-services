import { beforeEach, describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryConsentRepository, StubVersionConfig } from '../../../../shared-kernel/testing';
import { ConsentRequiredException } from '../../../domain/exceptions';
import { EnsureConsentAcceptedUseCase } from './ensure-consent-accepted.use-case';

describe('EnsureConsentAcceptedUseCase', () => {
  let consentRepository: InMemoryConsentRepository;
  let versionConfig: StubVersionConfig;
  let useCase: EnsureConsentAcceptedUseCase;

  beforeEach(() => {
    consentRepository = new InMemoryConsentRepository();
    versionConfig = new StubVersionConfig('1.0.0', '2.0.0', '1.0.0');
    useCase = new EnsureConsentAcceptedUseCase(consentRepository, versionConfig, stubLogger);
  });

  it('passes silently when both TOS and Privacy Policy were accepted at the current versions', async () => {
    await consentRepository.create({
      userId: 'u-1',
      documentType: 'TERMS_OF_SERVICE',
      version: '1.0.0',
    });
    await consentRepository.create({
      userId: 'u-1',
      documentType: 'PRIVACY_POLICY',
      version: '2.0.0',
    });

    await expect(useCase.execute({ userId: 'u-1' })).resolves.toBeUndefined();
  });

  it('throws ConsentRequiredException when TOS is missing', async () => {
    await consentRepository.create({
      userId: 'u-1',
      documentType: 'PRIVACY_POLICY',
      version: '2.0.0',
    });

    await expect(useCase.execute({ userId: 'u-1' })).rejects.toBeInstanceOf(
      ConsentRequiredException,
    );
  });

  it('throws ConsentRequiredException when the user accepted only an older TOS version', async () => {
    await consentRepository.create({
      userId: 'u-1',
      documentType: 'TERMS_OF_SERVICE',
      version: '0.9.0',
    });
    await consentRepository.create({
      userId: 'u-1',
      documentType: 'PRIVACY_POLICY',
      version: '2.0.0',
    });

    await expect(useCase.execute({ userId: 'u-1' })).rejects.toBeInstanceOf(
      ConsentRequiredException,
    );
  });
});
