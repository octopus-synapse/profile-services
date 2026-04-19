import { describe, expect, it } from 'bun:test';
import JSZip from 'jszip';
import { ExportBundleUseCase } from './export-bundle.use-case';

const pdfStub = {
  execute: async () => Buffer.from('%PDF-1.4 stub', 'utf-8'),
};

const docxStub = {
  execute: async () => Buffer.from('PK stub docx', 'utf-8'),
};

const jsonStub = {
  execute: async () => ({ basics: { name: 'Enzo' } }),
  executeAsBuffer: async () => Buffer.from(JSON.stringify({ basics: { name: 'Enzo' } }), 'utf-8'),
};

describe('ExportBundleUseCase', () => {
  it('should produce a zip containing all requested formats with sensible filenames', async () => {
    const useCase = new ExportBundleUseCase(pdfStub, docxStub, jsonStub);

    const buffer = await useCase.execute({ userId: 'user-1', resumeId: 'resume-1' });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    // ZIP magic: PK\x03\x04
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);

    const zip = await JSZip.loadAsync(buffer);
    expect(zip.file('resume.pdf')).not.toBeNull();
    expect(zip.file('resume.docx')).not.toBeNull();
    expect(zip.file('resume.json')).not.toBeNull();
  });

  it('should preserve per-format content inside the zip', async () => {
    const useCase = new ExportBundleUseCase(pdfStub, docxStub, jsonStub);
    const buffer = await useCase.execute({ userId: 'user-1', resumeId: 'resume-1' });
    const zip = await JSZip.loadAsync(buffer);

    const pdf = await zip.file('resume.pdf')!.async('string');
    const docx = await zip.file('resume.docx')!.async('string');
    const json = await zip.file('resume.json')!.async('string');

    expect(pdf).toBe('%PDF-1.4 stub');
    expect(docx).toBe('PK stub docx');
    expect(JSON.parse(json)).toEqual({ basics: { name: 'Enzo' } });
  });

  it('should allow opting out of formats via options.formats', async () => {
    const useCase = new ExportBundleUseCase(pdfStub, docxStub, jsonStub);

    const buffer = await useCase.execute({
      userId: 'user-1',
      resumeId: 'resume-1',
      formats: ['pdf', 'json'],
    });

    const zip = await JSZip.loadAsync(buffer);
    expect(zip.file('resume.pdf')).not.toBeNull();
    expect(zip.file('resume.json')).not.toBeNull();
    expect(zip.file('resume.docx')).toBeNull();
  });

  it('should surface per-format errors without aborting the whole zip', async () => {
    const failingDocx = {
      execute: async () => {
        throw new Error('docx engine down');
      },
    };
    const useCase = new ExportBundleUseCase(pdfStub, failingDocx, jsonStub);

    const buffer = await useCase.execute({ userId: 'user-1', resumeId: 'resume-1' });
    const zip = await JSZip.loadAsync(buffer);

    expect(zip.file('resume.pdf')).not.toBeNull();
    expect(zip.file('resume.json')).not.toBeNull();
    expect(zip.file('resume.docx')).toBeNull();
    // The failing format leaves a note in _errors.txt so the downloader
    // knows what went missing instead of getting a silent omission.
    expect(zip.file('_errors.txt')).not.toBeNull();
    const errors = await zip.file('_errors.txt')!.async('string');
    expect(errors).toContain('docx');
    expect(errors).toContain('docx engine down');
  });

  it('should default to all three formats when options.formats is omitted', async () => {
    const useCase = new ExportBundleUseCase(pdfStub, docxStub, jsonStub);
    const buffer = await useCase.execute({ userId: 'user-1', resumeId: 'resume-1' });
    const zip = await JSZip.loadAsync(buffer);

    const names = Object.keys(zip.files).sort();
    expect(names).toContain('resume.pdf');
    expect(names).toContain('resume.docx');
    expect(names).toContain('resume.json');
  });
});
