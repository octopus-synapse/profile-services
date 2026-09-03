import { describe, expect, it, mock } from 'bun:test';
import type { ConfigPort } from '@/shared-kernel/config';
import { stubLogger } from '@/shared-kernel/logger/testing';
import type { EmailSenderService, SendEmailOptions } from './email-sender.service';
import { EmailTemplateService } from './email-template.service';

function setup(lookup: (email: string) => Promise<'pt-BR' | 'en' | null>) {
  const sent: SendEmailOptions[] = [];
  const sender = {
    sendEmail: mock(async (options: SendEmailOptions) => void sent.push(options)),
  } as unknown as EmailSenderService;
  const config = { get: () => 'https://app.test' } as unknown as ConfigPort;
  const service = new EmailTemplateService(sender, config, stubLogger, lookup);
  return { service, sent };
}

describe('EmailTemplateService — the account language (decision 5)', () => {
  it('writes to an English account in English', async () => {
    const { service, sent } = setup(async () => 'en');
    await service.sendWelcomeEmail('a@b.c', 'Ana');
    expect(sent[0]?.subject).toBe('Welcome to Patch Careers!');
    expect(sent[0]?.html).toContain('<html lang="en">');
    expect(sent[0]?.html).toContain('Get started');
  });

  it('falls back to Portuguese for a stranger', async () => {
    const { service, sent } = setup(async () => null);
    await service.sendVerificationEmail('x@y.z', 'Ana', '123456');
    expect(sent[0]?.subject).toBe('Verifique seu email - Patch Careers');
    expect(sent[0]?.html).toContain('<html lang="pt-BR">');
  });

  it('lets the caller name the language for a stranger (pre-signup, from the request)', async () => {
    const { service, sent } = setup(async () => null);
    await service.sendVerificationEmail('x@y.z', 'Ana', '123456', 'en');
    expect(sent[0]?.subject).toBe('Verify your email - Patch Careers');
  });

  it('survives a broken lookup', async () => {
    const { service, sent } = setup(async () => {
      throw new Error('db down');
    });
    await service.sendPasswordChangeCode('a@b.c', 'Ana', '000000');
    expect(sent[0]?.subject).toBe('Confirme a alteração de senha - Patch Careers');
    expect(sent[0]?.html).toContain('alterar sua senha');
  });
});
